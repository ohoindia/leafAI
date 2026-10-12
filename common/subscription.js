export const subscriptionMessage =
  "Subscribe to use Market, Analyse Leaf and other app features. Weather remains available without a subscription.";
export function subscriptionRequired(screen, enabled, access) {
  return (
    enabled &&
    access !== true &&
    ![
      "home",
      "weather",
      "profile",
      "language",
      "account-details",
      "security",
      "subscription",
      "login",
      "register",
      "forgot",
      "reset",
    ].includes(screen.replace(/^\//, ""))
  );
}
