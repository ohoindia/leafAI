import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validSignature, nextMonth, entitled } from "../dist/billing/policy.js";
Object.assign(process.env, {
  NODE_ENV: "test", DB_HOST: "localhost", DB_NAME: "test", DB_USER: "test", DB_PASSWORD: "test", OPENAI_API_KEY: "test",
  JWT_ACCESS_SECRET: "a".repeat(32), JWT_REFRESH_SECRET: "b".repeat(32), UPLOAD_ENCRYPTION_KEY: "c".repeat(64),
  BILLING_ENABLED: "true", RAZORPAY_KEY_ID: "test", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "webhook",
  RAZORPAY_MONTHLY_PLAN_ID: "plan_month", RAZORPAY_YEARLY_PLAN_ID: "plan_year",
});
const { BillingService } = await import("../dist/billing/billing.module.js");
const { AuthGuard } = await import("../dist/auth/auth.guard.js");
const { subscriptionEnabled, razorpayConfiguration } = await import("../dist/billing/configuration.js");
import { subscriptionRequired } from "../../common/subscription.js";
const { default: jwt } = await import("jsonwebtoken");
test("payment and webhook signatures reject tampering, missing secrets and malformed digests", () => {
  const secret = "test_secret";
  const body = Buffer.from('{"event":"subscription.charged"}');
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(validSignature(body, signature, secret), true);
  assert.equal(validSignature(Buffer.from("tampered"), signature, secret), false);
  assert.equal(validSignature(body, "00", secret), false);
  assert.equal(validSignature(body, signature, ""), false);
});
test("introductory month clamps calendar dates and preserves time", () => {
  assert.equal(nextMonth(new Date("2026-01-31T12:30:00Z")), Date.parse("2026-02-28T12:30:00Z") / 1000);
  assert.equal(nextMonth(new Date("2028-01-31T12:30:00Z")), Date.parse("2028-02-29T12:30:00Z") / 1000);
  assert.equal(nextMonth(new Date("2026-12-12T12:30:00Z")), Date.parse("2027-01-12T12:30:00Z") / 1000);
});
test("unpaid, absent and expired subscriptions cannot access features", () => {
  assert.equal(entitled(undefined, 100), false);
  assert.equal(entitled({access_until: 0}, 100), false);
  assert.equal(entitled({access_until: 100}, 100), false);
  assert.equal(entitled({access_until: 101}, 100), true);
});
test("intro access requires a captured INR payment tied to this subscription", async () => {
  let written;
  const service = new BillingService({ execute: async (sql, values) => {
    if (sql.startsWith("SELECT")) return [[{intro_end: 2000, intro_used: false}]];
    written = values; return [{}];
  }});
  let invoiceSubscription = "sub_other";
  service.razor = async path => path.startsWith("subscriptions/") ? {status: "authenticated", paid_count: 0} : path.startsWith("payments/") ? {status: "captured", currency: "INR", amount: 100, invoice_id: "inv_1"} : {subscription_id: invoiceSubscription};
  await service.sync("sub_owned", "pay_1");
  assert.equal(written[2], 0);
  invoiceSubscription = "sub_owned";
  await service.sync("sub_owned", "pay_1");
  assert.equal(written[1], true);
  assert.equal(written[2], 2000);
});
test("renewals extend access only through a provider-confirmed paid period", async () => {
  let written;
  const service = new BillingService({ execute: async (sql, values) => {
    if (sql.startsWith("SELECT")) return [[{intro_used: true}]];
    written = values; return [{}];
  }});
  service.razor = async () => ({status: "active", paid_count: 1, current_end: 3000});
  await service.sync("sub_1");
  assert.equal(written[2], 3000);
  service.razor = async () => ({status: "pending", paid_count: 0, current_end: 4000});
  await service.sync("sub_1");
  assert.equal(written[2], 0);
});
test("checkout sends the correct introductory charge and annual recurrence; retry reuses mandate", async () => {
  const row = {user_id: "1", intro_used: false};
  const connection = {execute: async sql => sql.startsWith("SELECT") ? [[row]] : [{}]};
  const service = new BillingService({transaction: async work => work(connection)});
  service.config = async () => ({keyId: "test", keySecret: "secret", webhookSecret: "webhook", monthlyPlan: "plan_month", yearlyPlan: "plan_year"});
  const calls = [];
  service.razor = async (path, body) => {
    calls.push({path, body});
    if (path.startsWith("plans/")) return {period: "yearly", interval: 1, item: {currency: "INR", amount: 99900}};
    return {id: "sub_1", status: "created", short_url: "https://rzp.io/i/test"};
  };
  await service.create("1", "yearly");
  const creation = calls.find(call => call.path === "subscriptions").body;
  assert.equal(creation.plan_id, "plan_year");
  assert.equal(creation.addons[0].item.amount, 100);
  assert.ok(creation.start_at > Date.now()/1000);
  row.razorpay_id = "sub_1"; row.plan = "yearly";
  calls.length = 0;
  await service.create("1", "yearly");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "subscriptions/sub_1");
});
test("valid sessions without paid access get 402 while billing remains available", async () => {
  const guard = new AuthGuard({execute: async sql => sql.includes("user_sessions") ? [[{id: "session"}]] : sql.includes("ConfigValues") ? [[{ConfigValue: "true"}]] : [[]]});
  const token = jwt.sign({sid: "session"}, process.env.JWT_ACCESS_SECRET, {subject: "1", issuer: "leaf-care-ai", audience: "leaf-care-web"});
  const req = {path: "/api/analyses", headers: {authorization: `Bearer ${token}`}};
  const context = {switchToHttp: () => ({getRequest: () => req})};
  await assert.rejects(guard.canActivate(context), error => error.getStatus() === 402);
  req.path = "/api/billing";
  assert.equal(await guard.canActivate(context), true);
  req.path = "/api/weather";
  assert.equal(await guard.canActivate(context), true);
  req.path = "/api/weather/locations";
  assert.equal(await guard.canActivate(context), true);
});
test("database configuration controls subscriptions and supplies server-only Razorpay secrets", async () => {
  let toggle = "false";
  const db = { execute: async sql => sql.includes("ConfigValues") ? [[{ConfigValue: toggle}]] : [[{ConfigKey: "RAZORPAY_KEY_ID", ConfigValue: "db_key"}, {ConfigKey: "RAZORPAY_KEY_SECRET", ConfigValue: "db_secret"}]] };
  assert.equal(await subscriptionEnabled(db), false);
  toggle = "true";
  assert.equal(await subscriptionEnabled(db), true);
  toggle = "invalid";
  assert.equal(await subscriptionEnabled(db), false);
  const config = await razorpayConfiguration(db);
  assert.equal(config.keyId, "db_key");
  assert.equal(config.keySecret, "db_secret");
  const service = new BillingService(db);
  const status = await service.status("1");
  assert.equal(status.access, true);
  assert.equal(status.enabled, false);
  assert.equal(JSON.stringify(status).includes("db_secret"), false);
});
test("unsubscribed navigation permits Home, Weather and account controls and gates app features", () => {
  for (const screen of ["home", "/weather", "profile", "subscription", "security"]) assert.equal(subscriptionRequired(screen, true, false), false);
  for (const screen of ["market", "capture", "services", "farm", "learn", "history", "voice"]) {
    assert.equal(subscriptionRequired(screen, true, false), true);
    assert.equal(subscriptionRequired(screen, false, false), false);
    assert.equal(subscriptionRequired(screen, true, true), false);
  }
});
