import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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
export function LeafLogo({ large = false }: { large?: boolean }) {
  return <Image source={require("../assets/icon.png")} accessibilityLabel="Krishi Karshak leaf logo" style={{ width: large ? 88 : 38, height: large ? 88 : 38, borderRadius: large ? 22 : 10 }} />;
}
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
      <Text style={[s.buttonText, secondary && { color: "#005e80" }]}>
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
    <TextInput placeholderTextColor="#63758a" {...props} style={s.input} />
  );
}
export function PasswordField(props: React.ComponentProps<typeof TextInput>) {
  const [visible, setVisible] = useState(false);
  return <View style={{ position: "relative" }}>
    <TextInput placeholderTextColor="#63758a" {...props} secureTextEntry={!visible} style={[s.input, { paddingRight: 56 }]} />
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} accessibilityState={{ checked: visible }} onPress={() => setVisible(!visible)} style={{ position: "absolute", right: 4, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" }}>
      <View accessible={false} style={{ width: 23, height: 15, borderWidth: 1.8, borderColor: "#63758a", borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 7, height: 7, borderWidth: 1.5, borderColor: "#63758a", borderRadius: 4 }} />
        {visible && <View style={{ position: "absolute", width: 29, height: 2, backgroundColor: "#63758a", transform: [{ rotate: "45deg" }] }} />}
      </View>
    </Pressable>
  </View>;
}
export function Languages() {
  const a = useLeafCare();
  const [open, setOpen] = useState(false);
  return <>
    <Button secondary title={`Change language: ${languages[a.lang]}`} onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#142b4180", padding: 20 }}>
        <Pressable accessibilityLabel="Close language selection" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 350, backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 14 }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.heading}>Choose your language</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close language selection" onPress={() => setOpen(false)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={s.heading}>×</Text></Pressable>
          </View>
          <Text style={s.muted}>Select your preferred language.</Text>
          {(Object.keys(languages) as Language[]).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: a.lang === id }} onPress={() => { a.change(id); setOpen(false); }} style={[s.language, a.lang === id && s.selected, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
            <View><Text style={[s.body, { fontWeight: "600" }]}>{languages[id]}</Text><Text style={s.muted}>{id === "en" ? "English" : id === "te" ? "Telugu" : "Hindi"}</Text></View>
            <Text style={{ color: "#007ca8", fontSize: 20 }}>{a.lang === id ? "✓" : "○"}</Text>
          </Pressable>)}
        </View>
      </View>
    </Modal>
  </>;
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
                : a.go(auth ? "login" : "home")
            }
          >
            <Text style={s.heading}>←</Text>
          </Pressable>
          <View style={s.flex}>
            <View style={s.row}><LeafLogo /><Text style={s.heading}>{brand.name}</Text></View>
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
            <ActivityIndicator accessibilityLabel="Working" color="#007ca8" />
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
  safe: { flex: 1, backgroundColor: "#f7fafc" },
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
    borderColor: "#e0e9ef",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#142b41" },
  heading: { fontSize: 19, fontWeight: "700", color: "#142b41" },
  body: { color: "#142b41", fontSize: 16, lineHeight: 24 },
  muted: { color: "#63758a", fontSize: 14, lineHeight: 22 },
  small: { color: "#007ca8", fontSize: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e9ef",
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
    borderColor: "#d6e2ec",
    borderRadius: 12,
    fontSize: 16,
    color: "#142b41",
  },
  button: {
    backgroundColor: "#007ca8",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 48,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondary: { backgroundColor: "#edf8ff" },
  language: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6e2ec",
    gap: 5,
  },
  selected: { backgroundColor: "#edf8ff", borderColor: "#007ca8", borderWidth: 2 },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    resizeMode: "contain",
    backgroundColor: "#edf8ff",
  },
  error: { color: "#a12c22" },
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e0e9ef",
  },
  navItem: { flex: 1, paddingVertical: 18, alignItems: "center" },
});
