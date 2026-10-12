import React, { useEffect, useState, useRef } from "react";
export function Subscription({ api, onAccess, logout, onCheckout }) {
  const [status, setStatus] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const value = await api("/api/billing");
      setStatus(value);
      onAccess?.(value.access);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function subscribe(plan) {
    setBusy(true);
    setError("");
    try {
      const sub = await api("/api/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (!window.Razorpay)
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = resolve;
          script.onerror = () =>
            reject(new Error("Unable to load payment checkout"));
          document.head.appendChild(script);
        });
      const checkout = new window.Razorpay({
        key: sub.key,
        subscription_id: sub.id,
        name: "Krishi Karshak",
        description: "Subscription with AutoPay",
        modal: { ondismiss: () => onCheckout?.(false) },
        handler: async (response) => {
          onCheckout?.(false);
          try {
            await api("/api/billing/verify", {
              method: "POST",
              body: JSON.stringify(response),
            });
            await refresh();
          } catch (e) {
            setError(e.message);
          }
        },
      });
      onCheckout?.(true);
      checkout.open();
    } catch (e) {
      onCheckout?.(false);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await api("/api/billing/cancel", { method: "POST" });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="subscription-panel">
      <h2>Subscription</h2>
      <p>
        ₹1 for your first month. Then choose ₹99 per month or ₹999 per year. All
        app features are included.
      </p>
      <p>
        By continuing, you authorize recurring AutoPay through Razorpay. Your
        selected plan renews automatically after the introductory month. Cancel
        future payments here at any time; paid access lasts until expiry. The ₹1
        offer is available once per account.
      </p>
      {status?.subscription && (
        <p>
          Status: {status.subscription.status}.{" "}
          {status.subscription.accessUntil > 0 &&
            `Access until ${new Date(status.subscription.accessUntil * 1000).toLocaleDateString()}.`}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {status && !status.configured && (
        <p>Payments will be available once Razorpay setup is complete.</p>
      )}
      <button
        disabled={busy || !status?.configured}
        onClick={() => subscribe("monthly")}
      >
        Choose ₹99/month
      </button>{" "}
      <button
        disabled={busy || !status?.configured}
        onClick={() => subscribe("yearly")}
      >
        Choose ₹999/year
      </button>
      <p>
        <button disabled={busy} onClick={refresh}>
          Refresh payment status
        </button>{" "}
        {status?.subscription && (
          <button disabled={busy} onClick={cancel}>
            Cancel AutoPay
          </button>
        )}
      </p>
      {logout && <button onClick={logout}>Sign out</button>}
    </section>
  );
}
export function SubscriptionPopup({ api, onAccess, onNavigate }) {
  const panel = useRef(null);
  const checkoutActive = useRef(false);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keys = (event) => {
      if (checkoutActive.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...panel.current.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (
        document.activeElement === panel.current ||
        !panel.current.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keys);
      previous?.focus?.();
    };
  }, []);
  return (
    <div className="subscription-overlay">
      <div
        ref={panel}
        tabIndex={-1}
        className="subscription-popup"
        role="dialog"
        aria-modal="true"
        aria-label="Subscription required"
      >
        <Subscription
          api={api}
          onAccess={onAccess}
          onCheckout={(active) => {
            checkoutActive.current = active;
            if (!active) panel.current?.focus();
          }}
        />
        <div className="subscription-safe-navigation">
          <button onClick={() => onNavigate("home")}>Home</button>
          <button onClick={() => onNavigate("weather")}>Weather</button>
        </div>
      </div>
    </div>
  );
}
