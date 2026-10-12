import type { DatabaseService } from "../common/database.service.js";
export async function subscriptionEnabled(db: DatabaseService): Promise<boolean> {
  const [rows] = await db.execute("SELECT ConfigValue FROM ConfigValues WHERE ConfigKey='EnableSubscription'");
  return String(rows[0]?.ConfigValue).trim().toLowerCase() === "true";
}
export async function razorpayConfiguration(db: DatabaseService) {
  const [rows] = await db.execute("SELECT ConfigKey,ConfigValue FROM ConfigSecrets WHERE ConfigKey IN ('RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','RAZORPAY_MONTHLY_PLAN_ID','RAZORPAY_YEARLY_PLAN_ID')");
  const values: Record<string, string> = Object.fromEntries(rows.map((row: any) => [row.ConfigKey, String(row.ConfigValue).trim()]));
  return { keyId: values.RAZORPAY_KEY_ID || "", keySecret: values.RAZORPAY_KEY_SECRET || "", webhookSecret: values.RAZORPAY_WEBHOOK_SECRET || "", monthlyPlan: values.RAZORPAY_MONTHLY_PLAN_ID || "", yearlyPlan: values.RAZORPAY_YEARLY_PLAN_ID || "" };
}
export function configurationReady(config: Awaited<ReturnType<typeof razorpayConfiguration>>) {
  return Object.values(config).every(Boolean);
}
