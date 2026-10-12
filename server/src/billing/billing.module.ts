import { Module, Controller, Get, Post, Req, Body, UseGuards, Injectable, BadRequestException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { DatabaseService } from "../common/database.service.js";
import { razorpayConfiguration, subscriptionEnabled, configurationReady } from "./configuration.js";
import { entitled, nextMonth, validSignature } from "./policy.js";
import type { ApiRequest } from "../common/api-request.js";

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}
  config() { return razorpayConfiguration(this.db); }
  async razor(path: string, body?: any) {
    const config = await this.config();
    if (!configurationReady(config)) throw new ServiceUnavailableException("Subscriptions are not configured yet. Please try again later.");
    const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: body ? "POST" : "GET", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new ServiceUnavailableException("Razorpay could not process this request. Please retry.");
    return response.json() as Promise<any>;
  }
  async row(user: string) {
    const [rows] = await this.db.execute("SELECT * FROM subscriptions WHERE user_id=?", [user]);
    return rows[0];
  }
  async sync(id: string, paymentId?: string) {
    const sub = await this.razor(`subscriptions/${encodeURIComponent(id)}`);
    const [rows] = await this.db.execute("SELECT * FROM subscriptions WHERE razorpay_id=?", [id]);
    const row = rows[0];
    if (!row) return;
    let introPaid = false;
    if (!paymentId && sub.status === "authenticated" && !row.intro_used) {
      const invoices = await this.razor(`invoices?subscription_id=${encodeURIComponent(id)}&count=100`);
      paymentId = invoices.items?.find((invoice: any) => invoice.subscription_id === id && invoice.status === "paid" && invoice.amount_paid === 100)?.payment_id;
    }
    if (paymentId) {
      const payment = await this.razor(`payments/${encodeURIComponent(paymentId)}`);
      // Link the captured payment to this subscription through its invoice.
      if (payment.invoice_id) {
        const invoice = await this.razor(`invoices/${encodeURIComponent(payment.invoice_id)}`);
        introPaid = invoice.subscription_id === id && payment.status === "captured" && payment.currency === "INR" && payment.amount === 100;
      }
    }
    const until = Number(sub.paid_count) > 0 && sub.current_end ? Number(sub.current_end) : introPaid ? Number(row.intro_end) : 0;
    // Fetching the current provider state makes duplicate/out-of-order webhooks harmless.
    await this.db.execute("UPDATE subscriptions SET status=?, intro_used=IF(?,1,intro_used), access_until=GREATEST(access_until,?) WHERE razorpay_id=?", [sub.status, introPaid || Number(sub.paid_count) > 0, until, id]);
  }
  async status(user: string, refresh = false) {
    const enabled = await subscriptionEnabled(this.db);
    const configured = configurationReady(await this.config());
    if (!enabled && !configured) return { enabled, configured, access: true, subscription: null };
    let row = await this.row(user);
    if (refresh && row?.razorpay_id && configured) { await this.sync(row.razorpay_id); row = await this.row(user); }
    return { enabled, configured, access: !enabled || entitled(row), subscription: row ? { plan: row.plan, status: row.status, accessUntil: Number(row.access_until), introUsed: Boolean(row.intro_used) } : null };
  }
  async create(user: string, plan: string) {
    if (!["monthly", "yearly"].includes(plan)) throw new BadRequestException("Choose monthly or yearly.");
    const config = await this.config();
    // Serialize per user so two checkout requests cannot create two mandates.
    return this.db.transaction(async connection => {
      await connection.execute("INSERT IGNORE INTO subscriptions(user_id) VALUES(?)", [user]);
      const [rows] = await connection.execute("SELECT * FROM subscriptions WHERE user_id=? FOR UPDATE", [user]);
      const row = rows[0];
      if (row.razorpay_id) {
        const existing = await this.razor(`subscriptions/${encodeURIComponent(row.razorpay_id)}`);
        if (!["cancelled", "completed", "expired"].includes(existing.status)) {
          if (row.plan !== plan) throw new BadRequestException("Cancel the existing subscription before changing plans.");
          return { id: existing.id, url: existing.short_url, key: config.keyId };
        }
        if (!row.intro_used) {
          const invoices = await this.razor(`invoices?subscription_id=${encodeURIComponent(row.razorpay_id)}&count=100`);
          if (Number(existing.paid_count) > 0 || invoices.items?.some((invoice: any) => invoice.subscription_id === row.razorpay_id && invoice.status === "paid" && invoice.amount_paid === 100)) {
            row.intro_used = 1;
            await connection.execute("UPDATE subscriptions SET intro_used=1 WHERE user_id=?", [user]);
          }
        }
      }
      const introEnd = row.intro_used ? null : nextMonth();
      const planId = plan === "monthly" ? config.monthlyPlan : config.yearlyPlan;
      const providerPlan = await this.razor(`plans/${encodeURIComponent(planId)}`);
      if (providerPlan.period !== (plan === "monthly" ? "monthly" : "yearly") || providerPlan.interval !== 1 || providerPlan.item?.currency !== "INR" || providerPlan.item?.amount !== (plan === "monthly" ? 9900 : 99900)) throw new ServiceUnavailableException("The configured Razorpay plan does not match the advertised price.");
      const sub = await this.razor("subscriptions", {
        plan_id: planId,
        total_count: plan === "monthly" ? 120 : 10, quantity: 1, customer_notify: 1,
        ...(introEnd ? { start_at: introEnd, expire_by: Math.floor(Date.now()/1000) + 3600, addons: [{ item: { name: "First month access", amount: 100, currency: "INR" } }] } : {}),
        notes: { user_id: user },
      });
      await connection.execute("UPDATE subscriptions SET razorpay_id=?,plan=?,status=?,intro_end=? WHERE user_id=?", [sub.id, plan, sub.status, introEnd, user]);
      return { id: sub.id, url: sub.short_url, key: config.keyId };
    });
  }
}

@Controller("billing")
class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() @UseGuards(AuthGuard)
  status(@Req() req: ApiRequest) { return this.billing.status(req.user.sub, true); }
  @Post("subscribe") @UseGuards(AuthGuard)
  create(@Req() req: ApiRequest, @Body() body: any) { return this.billing.create(req.user.sub, body?.plan); }
  @Post("verify") @UseGuards(AuthGuard)
  async verify(@Req() req: ApiRequest, @Body() body: any) {
    const row = await this.billing.row(req.user.sub);
    const config = await this.billing.config();
    if (!row?.razorpay_id || body?.razorpay_subscription_id !== row.razorpay_id || !validSignature(`${body.razorpay_payment_id}|${row.razorpay_id}`, body.razorpay_signature, config.keySecret)) throw new BadRequestException("Invalid payment signature");
    await this.billing.sync(row.razorpay_id, body.razorpay_payment_id);
    return this.billing.status(req.user.sub);
  }
  @Post("cancel") @UseGuards(AuthGuard)
  async cancel(@Req() req: ApiRequest) {
    const row = await this.billing.row(req.user.sub);
    if (!row?.razorpay_id) throw new BadRequestException("No subscription to cancel");
    // Stop future debits immediately; paid access remains until its recorded expiry.
    await this.billing.razor(`subscriptions/${encodeURIComponent(row.razorpay_id)}/cancel`, { cancel_at_cycle_end: false });
    await this.billing.sync(row.razorpay_id);
    return this.billing.status(req.user.sub);
  }
  @Post("webhook")
  async webhook(@Req() req: any, @Body() body: any) {
    const config = await this.billing.config();
    if (!validSignature(req.rawBody || Buffer.alloc(0), req.headers["x-razorpay-signature"], config.webhookSecret)) throw new UnauthorizedException("Invalid webhook signature");
    const sub = body?.payload?.subscription?.entity;
    if (sub?.id) await this.billing.sync(sub.id, body?.payload?.payment?.entity?.id);
    return { received: true };
  }
}
@Module({ imports: [AuthModule], controllers: [BillingController], providers: [BillingService] })
export class BillingModule {}
