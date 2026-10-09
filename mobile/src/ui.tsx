import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { brand, languages } from "../../common/content.js";
import type { Language } from "../../common/types";
import { useLeafCare } from "./state";
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#185b31" }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Card({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      {title && <Text style={s.heading}>{title}</Text>}
      {children}
    </View>
  );
}
export function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput placeholderTextColor="#708078" {...props} style={s.input} />
  );
}
export function Languages() {
  const a = useLeafCare();
  return (
    <View style={s.row}>
      {(Object.keys(languages) as Language[]).map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityState={{ selected: a.lang === id }}
          onPress={() => a.change(id)}
          style={[s.language, a.lang === id && s.selected]}
        >
          <Text style={{ color: a.lang === id ? "#fff" : "#185b31" }}>
            {languages[id]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Page({
  title,
  children,
  auth = false,
  processing = false,
}: {
  title: string;
  children: React.ReactNode;
  auth?: boolean;
  processing?: boolean;
}) {
  const a = useLeafCare();
  if (auth && a.token) return <Redirect href="/home" />;
  if (!auth && !a.token) return <Redirect href="/login" />;
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.header}>
          <Pressable
            disabled={processing}
            accessibilityLabel="Go back"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : a.go(auth ? "language" : "home")
            }
          >
            <Text style={s.heading}>←</Text>
          </Pressable>
          <View style={s.flex}>
            <Text style={s.heading}>🌿 {brand.name}</Text>
            <Text style={s.small}>{brand.tagline}</Text>
          </View>
          {!auth && (
            <Pressable
              disabled={processing || a.busy}
              accessibilityLabel="Your profile"
              onPress={() => a.go("profile")}
            >
              <Text style={s.heading}>☰</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.container}
        >
          <Text style={s.title}>{title}</Text>
          {!!a.error && (
            <Card>
              <Text accessibilityRole="alert" style={s.error}>
                {a.error}
              </Text>
              <Button
                secondary
                title="Dismiss"
                onPress={() => a.setError("")}
              />
            </Card>
          )}
          {children}
          {a.busy && (
            <ActivityIndicator accessibilityLabel="Working" color="#357b35" />
          )}
        </ScrollView>
        {!auth && !processing && (
          <View style={s.nav}>
            {(
              [
                ["home", "Home"],
                ["capture", "Analyze"],
                ["history", "History"],
                ["learn", "Learn"],
              ] as const
            ).map(([route, label]) => (
              <Pressable
                disabled={a.busy}
                accessibilityRole="button"
                key={route}
                onPress={() => a.go(route)}
                style={s.navItem}
              >
                <Text style={s.small}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f8ee" },
  flex: { flex: 1 },
  container: {
    padding: 22,
    gap: 18,
    paddingBottom: 36,
    maxWidth: 650,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#dce7dc",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#15392e" },
  heading: { fontSize: 19, fontWeight: "700", color: "#15392e" },
  body: { color: "#15392e", fontSize: 16, lineHeight: 24 },
  muted: { color: "#708078", fontSize: 14, lineHeight: 22 },
  small: { color: "#357b35", fontSize: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce7dc",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  hero: { borderRadius: 22, padding: 24, gap: 16 },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderWidth: 1,
    borderColor: "#cbd8cd",
    borderRadius: 12,
    fontSize: 16,
    color: "#15392e",
  },
  button: {
    backgroundColor: "#357b35",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 48,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondary: { backgroundColor: "#e4f0df" },
  language: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#e4f0df",
  },
  selected: { backgroundColor: "#357b35" },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    resizeMode: "contain",
    backgroundColor: "#e4f0df",
  },
  error: { color: "#a12c22" },
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#dce7dc",
  },
  navItem: { flex: 1, paddingVertical: 18, alignItems: "center" },
});
