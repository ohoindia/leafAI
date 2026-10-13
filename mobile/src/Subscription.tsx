import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Page, s } from "./ui";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useLeafCare } from "./state";
import { request } from "./api";
type Status = {
  enabled: boolean;
  access: boolean;
  configured: boolean;
  subscription: null | { status: string; accessUntil: number };
};
export function Subscription({
  onStatus,
  compact = false,
}: {
  onStatus?: (value: Status) => void;
  compact?: boolean;
}) {
  const { token, setBillingStatus, setSubscriptionPopup } =
    useLeafCare();
  const [status, setStatus] = useState<Status>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const value = await request<Status>("/api/billing", token);
      setStatus(value);
      setBillingStatus(value);
      if (value.access) setSubscriptionPopup(false);
      onStatus?.(value);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to retrieve subscription",
      );
    }
  }
  useEffect(() => {
    let active = true;
    void request<Status>("/api/billing", token)
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to retrieve subscription",
          );
      });
    return () => {
      active = false;
    };
  }, [token]);
  async function action(plan?: string) {
    setBusy(true);
    setError("");
    try {
      if (plan) {
        const sub = await request<{ url: string }>(
          "/api/billing/subscribe",
          token,
          { method: "POST", body: JSON.stringify({ plan }) },
        );
        if (!/^https:\/\/(rzp\.io|razorpay\.com)\//.test(sub.url))
          throw new Error("Invalid checkout URL");
        await Linking.openURL(sub.url);
      } else {
        await request("/api/billing/cancel", token, { method: "POST" });
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentContainerStyle={{
        padding: compact ? 28 : 0,
        gap: 18,
      }}
    >
      <Text
        style={s.pageTitle}
      >
        Subscription
      </Text>
      <Text style={s.body}>
        ₹1 for your first month. Then choose ₹99 per month or ₹999 per year. All
        app features are included.
      </Text>
      <Text style={s.body}>
        By continuing, you authorize recurring AutoPay through Razorpay. Your
        selected plan renews automatically after the introductory month. Cancel
        future payments here at any time; paid access lasts until expiry. The ₹1
        offer is available once per account.
      </Text>
      {status?.subscription && (
        <Text style={s.body}>
          Status: {status.subscription.status}. {status.subscription.accessUntil > 0 && `Access until ${new Date(
            status.subscription.accessUntil * 1000,
          ).toLocaleDateString()}.`}
        </Text>
      )}
      {status && !status.configured && (
        <Text style={s.body}>Payments will be available once Razorpay setup is complete.</Text>
      )}
      {!!error && <Text style={s.error} accessibilityRole="alert">{error}</Text>}
      <Button
        title="Choose ₹99/month"
        disabled={busy || !status?.configured}
        onPress={() => void action("monthly")}
      />
      <Button
        title="Choose ₹999/year"
        disabled={busy || !status?.configured}
        onPress={() => void action("yearly")}
      />
      <Button
        title="Refresh payment status"
        disabled={busy}
        onPress={() => void refresh()}
      />
      {compact && <View style={s.row}><Button
        title="Home"
        onPress={() => {
          setSubscriptionPopup(false);
          router.replace("/home");
        }}
      />
      <Button
        title="Weather"
        onPress={() => {
          setSubscriptionPopup(false);
          router.push("/weather");
        }}
      /></View>}
      {status?.subscription && (
        <Button
          title="Cancel AutoPay"
          disabled={busy}
          onPress={() => void action()}
        />
      )}
    </ScrollView>
  );
}
export function SubscriptionScreen() {
  return <Page><Subscription /></Page>;
}
