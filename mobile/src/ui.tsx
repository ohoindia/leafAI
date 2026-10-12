import { useLocale } from "./locale";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Keyboard,
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
import { Redirect, router, usePathname } from "expo-router";
import { accountInitials, brand, languages } from "../../common/content.js";
import { endpoints } from "../../common/api.js";
import { apiUrl } from "./api";
import type { Language } from "../../common/types";
import { useLeafCare } from "./state";
import { subscriptionRequired } from "../../common/subscription.js";
import { Subscription } from "./Subscription";
import { NavigationIcon } from "./NavigationIcon";
export function UserAvatar({ large = false }: { large?: boolean }) {
  const localize = useLocale();
  const a = useLeafCare();
  const [failed, setFailed] = useState<string>();
  const size = large ? 96 : 48;
  return a.user?.profilePhoto && failed !== a.user.profilePhoto ? (
    <Image
      accessibilityLabel={localize("Your profile photo")}
      source={{ uri: a.user.profilePhoto }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setFailed(a.user?.profilePhoto || "")}
    />
  ) : (
    <View
      style={[
        s.accountAvatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[s.avatarText, large && { fontSize: 30 }]}>
        {accountInitials(a.user?.fullName)}
      </Text>
    </View>
  );
}
export function LeafLogo({ large = false }: { large?: boolean }) {
  const localize = useLocale();
  return (
    <Image
      source={require("../assets/krishi-farmer-logo.png")}
      resizeMode="contain"
      accessibilityLabel={localize("Krishi Karshak farmer and plough logo")}
      style={{
        width: large ? 112 : 44,
        height: large ? 112 : 44,
        flexShrink: 0,
      }}
    />
  );
}
export function AnalysisPhoto({
  id,
  fallback,
  thumbnail = false,
}: {
  id: string;
  fallback?: string;
  thumbnail?: boolean;
}) {
  const localize = useLocale();
  const a = useLeafCare();
  const [failedSource, setFailedSource] = useState("");
  const uri = fallback || `${apiUrl}${endpoints.image(id)}`;
  return failedSource === uri ? (
    <View style={[s.image, thumbnail && s.thumbnail, s.photoPlaceholder]}>
      <LeafLogo />
      {!thumbnail && (
        <Text style={s.muted}>{localize("Photo unavailable")}</Text>
      )}
    </View>
  ) : (
    <Image
      source={
        fallback
          ? { uri }
          : { uri, headers: { Authorization: `Bearer ${a.token}` } }
      }
      accessibilityLabel={localize("Analyzed leaf")}
      style={[s.image, thumbnail && s.thumbnail]}
      onError={() => setFailedSource(uri)}
    />
  );
}
export function AuthBrand({ register = false }: { register?: boolean }) {
  const localize = useLocale();
  return (
    <View style={s.authBrand}>
      <LeafLogo large />
      <Text style={s.brandTitle}>{brand.name}</Text>
      <Text style={[s.muted, { textAlign: "center" }]}>
        {localize(
          register
            ? "Grow Today\nGreener Tomorrow"
            : "Good Plants\nBrighter Days",
        )}
      </Text>
    </View>
  );
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
  const localize = useLocale();
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
        {localize(title)}
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
  const localize = useLocale();
  return (
    <View style={s.card}>
      {title && <Text style={s.heading}>{localize(title)}</Text>}
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
  const localize = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ position: "relative" }}>
      <TextInput
        placeholderTextColor="#63758a"
        {...props}
        secureTextEntry={!visible}
        style={[s.input, { paddingRight: 56 }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={localize(
          visible ? "Hide password" : "Show password",
        )}
        accessibilityState={{ checked: visible }}
        onPress={() => setVisible(!visible)}
        style={{
          position: "absolute",
          right: 4,
          top: 0,
          bottom: 0,
          width: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          accessible={false}
          style={{
            width: 23,
            height: 15,
            borderWidth: 1.8,
            borderColor: "#63758a",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderWidth: 1.5,
              borderColor: "#63758a",
              borderRadius: 4,
            }}
          />
          {visible && (
            <View
              style={{
                position: "absolute",
                width: 29,
                height: 2,
                backgroundColor: "#63758a",
                transform: [{ rotate: "45deg" }],
              }}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}
export function Languages() {
  const localize = useLocale();
  const a = useLeafCare();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        secondary
        title={`${localize("Change language")}: ${languages[a.lang]}`}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#142b4180",
            padding: 20,
          }}
        >
          <Pressable
            accessibilityLabel={localize("Close language selection")}
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 350,
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 20,
              gap: 14,
            }}
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.heading}>{localize("Choose your language")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={localize("Close language selection")}
                onPress={() => setOpen(false)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={s.heading}>×</Text>
              </Pressable>
            </View>
            <Text style={s.muted}>
              {localize("Select your preferred language.")}
            </Text>
            {(Object.keys(languages) as Language[]).map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: a.lang === id }}
                onPress={() => {
                  a.change(id);
                  setOpen(false);
                }}
                style={[
                  s.language,
                  a.lang === id && s.selected,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  },
                ]}
              >
                <View>
                  <Text style={[s.body, { fontWeight: "600" }]}>
                    {languages[id]}
                  </Text>
                  <Text style={s.muted}>
                    {localize(
                      id === "en"
                        ? "English"
                        : id === "te"
                          ? "Telugu"
                          : id === "hi"
                            ? "Hindi"
                            : id === "kn"
                              ? "Kannada"
                              : "Tamil",
                    )}
                  </Text>
                </View>
                <Text style={{ color: "#007ca8", fontSize: 20 }}>
                  {localize(a.lang === id ? "✓" : "○")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
export function Page({
  title,
  children,
  auth = false,
  processing = false,
  branding,
}: {
  title: string;
  children: React.ReactNode;
  auth?: boolean;
  processing?: boolean;
  branding?: React.ReactNode;
}) {
  const localize = useLocale();
  const a = useLeafCare();
  const pathname = usePathname();
  const featureLocked =
    !auth &&
    subscriptionRequired(
      pathname,
      a.billingStatus.enabled,
      a.billingStatus.access,
    );
  const scrollRef = useRef<ScrollView>(null);
  const keyboardScrollFrame = useRef<number | null>(null);
  const revealFocusedInput = useCallback(() => {
    if (!auth || Platform.OS === "web" || !Keyboard.isVisible()) return;
    if (keyboardScrollFrame.current !== null)
      cancelAnimationFrame(keyboardScrollFrame.current);
    keyboardScrollFrame.current = requestAnimationFrame(() => {
      keyboardScrollFrame.current = null;
      const input = TextInput.State.currentlyFocusedInput();
      if (input)
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
          input,
          24,
          true,
        );
    });
  }, [auth]);
  useEffect(() => {
    if (!auth || Platform.OS === "web") return;
    // Wait for the resized viewport before measuring the active field.
    const subscription = Keyboard.addListener(
      "keyboardDidShow",
      revealFocusedInput,
    );
    return () => {
      subscription.remove();
      if (keyboardScrollFrame.current !== null)
        cancelAnimationFrame(keyboardScrollFrame.current);
    };
  }, [auth, revealFocusedInput]);
  const activeRoute = ["/review", "/details", "/processing"].includes(pathname)
    ? "/capture"
    : ["/result", "/full"].includes(pathname)
      ? "/history"
      : ["/language", "/account-details", "/security"].includes(pathname)
        ? "/profile"
        : pathname;
  if (auth && a.token) return <Redirect href="/home" />;
  if (!auth && !a.token) return <Redirect href="/login" />;
  return (
    <SafeAreaView style={[s.safe, auth && { backgroundColor: "#eaf7ff" }]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={
          Platform.OS === "ios" ? "padding" : auth ? "height" : undefined
        }
      >
        {!auth && (
          <View style={s.header}>
            <Pressable
              disabled={processing}
              accessibilityLabel={localize("Go back")}
              accessibilityRole="button"
              style={s.iconButton}
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : a.go(auth ? "login" : "home")
              }
            >
              <Text style={s.heading}>←</Text>
            </Pressable>
            <View style={s.flex}>
              <View style={s.row}>
                <LeafLogo />
                <Text style={s.heading}>{brand.name}</Text>
              </View>
              <Text style={s.small}>{localize(brand.tagline)}</Text>
            </View>
            {!auth && (
              <Pressable
                disabled={processing || a.busy}
                accessibilityRole="button"
                accessibilityLabel={localize(
                  `Open profile for ${a.user?.fullName || "your account"}`,
                )}
                style={s.accountAvatar}
                onPress={() => a.go("profile")}
              >
                <UserAvatar />
              </Pressable>
            )}
          </View>
        )}
        {featureLocked && (
          <View style={s.notice}>
            <Text style={s.body}>
              Subscribe to use this feature. Weather remains available.
            </Text>
          </View>
        )}
        <ScrollView
          ref={scrollRef}
          style={[s.flex, featureLocked && { opacity: 0.5 }]}
          pointerEvents={featureLocked ? "none" : "auto"}
          scrollEnabled={!featureLocked}
          accessibilityElementsHidden={featureLocked}
          importantForAccessibility={
            featureLocked ? "no-hide-descendants" : "auto"
          }
          onLayout={revealFocusedInput}
          onContentSizeChange={revealFocusedInput}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[s.container, auth && s.authContainer]}
        >
          {branding}
          <Text style={s.title}>{localize(title)}</Text>
          {!!a.notice && (
            <View style={s.notice}>
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: "#185b31" }}
              >
                {a.notice}
              </Text>
            </View>
          )}
          {!!a.error && (
            <Card>
              <Text accessibilityRole="alert" style={s.error}>
                {a.error}
              </Text>
              <Button
                secondary
                title={localize("Dismiss")}
                onPress={() => a.setError("")}
              />
            </Card>
          )}
          {children}
          {a.busy && (
            <ActivityIndicator
              accessibilityLabel={localize("Working")}
              color="#007ca8"
            />
          )}
        </ScrollView>
        {!auth && !processing && (
          <View style={s.nav}>
            {(
              [
                ["market", "Market"],
                ["weather", "Weather"],
                ["home", "Home"],
                ["services", "Services"],
                ["profile", "Profile"],
              ] as const
            ).map(([route, label]) => (
              <Pressable
                disabled={a.busy}
                accessibilityRole="button"
                accessibilityLabel={localize(label)}
                accessibilityState={{
                  selected:
                    activeRoute === `/${route}` ||
                    (route === "profile" &&
                      [
                        "/farm",
                        "/farm-details",
                        "/language",
                        "/account-details",
                        "/security",
                      ].includes(activeRoute)),
                  disabled: a.busy,
                }}
                key={route}
                onPress={() => a.go(route)}
                style={[
                  s.navItem,
                  (activeRoute === `/${route}` ||
                    (route === "profile" &&
                      [
                        "/farm",
                        "/farm-details",
                        "/language",
                        "/account-details",
                        "/security",
                      ].includes(activeRoute))) &&
                    s.navSelected,
                ]}
              >
                <View style={[s.navIcon, route === "home" && s.navHomeIcon]}>
                  <NavigationIcon
                    route={route}
                    inverted={route === "home"}
                    selected={
                      activeRoute === `/${route}` ||
                      (route === "profile" &&
                        [
                          "/farm",
                          "/farm-details",
                          "/language",
                          "/account-details",
                          "/security",
                        ].includes(activeRoute))
                    }
                  />
                </View>
                <Text
                  style={[
                    s.small,
                    { color: "#63758a" },
                    (activeRoute === `/${route}` ||
                      (route === "profile" &&
                        [
                          "/farm",
                          "/farm-details",
                          "/language",
                          "/account-details",
                          "/security",
                        ].includes(activeRoute))) && {
                      color: "#007ca8",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {localize(label)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal
        transparent
        animationType="fade"
        visible={a.subscriptionPopup || featureLocked}
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 20,
            backgroundColor: "rgba(18,51,74,0.2)",
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              maxHeight: "85%",
              backgroundColor: "white",
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            <Subscription compact />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export const s = StyleSheet.create({
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    maxWidth: 430,
    paddingVertical: 28,
    gap: 20,
  },
  authBrand: { alignItems: "center", gap: 10, marginVertical: 12 },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#12334a",
    textAlign: "center",
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "#142b4180",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  menuCard: {
    width: "100%",
    maxWidth: 350,
    padding: 20,
    gap: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  notice: { backgroundColor: "#e8f6ee", padding: 16, borderRadius: 12 },
  thumbnail: { width: 55, height: 60, borderRadius: 10, resizeMode: "cover" },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", gap: 12 },
  navSelected: { backgroundColor: "#f5fbff", borderRadius: 28 },
  divider: { textAlign: "center", color: "#63758a" },
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
  selected: {
    backgroundColor: "#edf8ff",
    borderColor: "#007ca8",
    borderWidth: 2,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    resizeMode: "contain",
    backgroundColor: "#edf8ff",
  },
  error: { color: "#a12c22" },
  navIcon: {
    width: 40,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  navHomeIcon: {
    width: 60,
    height: 60,
    marginTop: -14,
    borderRadius: 30,
    backgroundColor: "#102c70",
    boxShadow: "0 2px 6px rgba(16, 44, 112, 0.16)",
  },
  nav: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 36,
    paddingHorizontal: 8,
    paddingVertical: 5,
    boxShadow: "0 2px 20px rgba(18, 35, 58, 0.14)",
    flexShrink: 0,
    flexDirection: "row",
    backgroundColor: "#fff",
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eaf7ff",
    borderWidth: 1,
    borderColor: "#c6e5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#007ca8", fontSize: 18, fontWeight: "700" },
  navItem: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 4,
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
