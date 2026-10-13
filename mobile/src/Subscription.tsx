import { typography } from "./theme";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, Button } from "react-native";
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
  const { token, logout, setBillingStatus, setSubscriptionPopup } =
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
        padding: 28,
        paddingTop: compact ? 16 : 70,
        gap: 18,
      }}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily,
          fontSize: 26,
          fontWeight: "bold",
        }}
      >
        Subscription and AutoPay
      </Text>
      <Text>
        ₹1 for your first month, then ₹99/month or ₹999/year. All app features
        are included. The introductory offer is available once per account.
      </Text>
      <Text>
        Continuing authorizes recurring Razorpay AutoPay. Cancel future payments
        here at any time. Paid access lasts until expiry. After payment, return
        to the app and refresh status.
      </Text>
      {status?.subscription && (
        <Text>
          Status: {status.subscription.status}. Access until{" "}
          {new Date(
            status.subscription.accessUntil * 1000,
          ).toLocaleDateString()}
          .
        </Text>
      )}
      {status && !status.configured && (
        <Text>Payments will be available once Razorpay setup is complete.</Text>
      )}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
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
      <Button
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
      />
      {status?.subscription && (
        <Button
          title="Cancel AutoPay"
          disabled={busy}
          onPress={() => void action()}
        />
      )}
      <Button title="Sign out" onPress={() => void logout()} />
    </ScrollView>
  );
}
