import { Platform } from "react-native";

// Native system fonts retain support for every language offered in the app.
export const typography = {
  fontFamily: Platform.select({
    android: "sans-serif",
    ios: "System",
    default: 'Roboto, "Segoe UI", Arial, sans-serif',
  }),
};
