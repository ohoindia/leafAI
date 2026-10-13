import { typography } from "./theme";
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
      <Text
        style={[
          s.avatarText,
          large && { fontFamily: typography.fontFamily, fontSize: 30 },
        ]}
      >
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
        width: large ? 130 : 44,
        height: large ? 130 : 44,
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
      style={[s.image, { height: 220, borderRadius: 15, resizeMode: "cover" }, thumbnail && s.thumbnail]}
      onError={() => setFailedSource(uri)}
    />
  );
}
export function AuthBrand({ register = false }: { register?: boolean }) {
  const localize = useLocale();
  return (
    <View style={s.authBrand}>
      <LeafLogo large />
      <Text style={[s.muted, { textAlign: "center", fontSize: 15 }]}>{localize(register ? "Grow Today" : "Healthy Crops")}{"\n"}{localize(register ? "Greener Tomorrow" : "Thriving Farms")}</Text>
    </View>
  );
}
export function BrandFooter({ text }: { text: string }) {
  const localize = useLocale();
  return <View style={{ alignSelf: "center", width: 190, alignItems: "center", marginTop: 12, gap: 5 }}>
    <Image source={require("../assets/krishi-farmer-logo.png")} resizeMode="contain" style={{ width: 27, height: 44 }} />
    <Text style={[s.muted, { fontSize: 12, lineHeight: 16, textAlign: "center" }]}>{localize(text)}</Text>
  </View>;
}
export function SelectField({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void; disabled?: boolean }) {
  const localize = useLocale();
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={localize(label)} accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(true)} style={[s.input, s.row, { justifyContent: "space-between" }]}>
      <Text style={[s.body, { flex: 1 }]}>{localize(options.find(([id]) => id === value)?.[1] || label)}</Text><Text style={s.muted}>⌄</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.menuBackdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={localize("Cancel")} onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[s.menuCard, { maxHeight: "80%" }]}>
          <Text style={s.heading}>{localize(label)}</Text>
          <ScrollView>{options.map(([id, title]) => <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: value === id }} onPress={() => { onChange(id); setOpen(false); }} style={[s.language, { marginBottom: 8 }, value === id && s.selected]}><Text style={s.body}>{localize(title)}</Text></Pressable>)}</ScrollView>
          <Button secondary title="Cancel" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </>;
}
export function ResultLanguages() {
  const localize = useLocale();
  const a = useLeafCare();
  return <View style={[s.row, { gap: 7 }]}>{(Object.keys(languages) as Language[]).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: a.lang === id }} onPress={() => a.change(id)} style={[s.button, { padding: 9, minHeight: 40 }, a.lang !== id && s.outline]}><Text style={[s.buttonText, { fontSize: 13 }, a.lang !== id && { color: "#218653" }]}>{localize(languages[id])}</Text></Pressable>)}</View>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  variant,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  variant?: "outline" | "light" | "glass";
  icon?: React.ReactNode;
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
        variant === "outline" && s.outline,
        variant === "light" && s.light,
        variant === "glass" && s.glass,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      {icon}
      <Text style={[s.buttonText, secondary && { color: "#17673f" }, (variant === "outline" || variant === "light") && { color: "#218653" }]}>
        {localize(title)}
      </Text>
    </Pressable>
  );
}
export function Card({
  title,
  children,
  soft = false,
}: {
  title?: string;
  children?: React.ReactNode;
  soft?: boolean;
}) {
  const localize = useLocale();
  return (
    <View style={[s.card, soft && s.soft]}>
      {title && <Text style={s.heading}>{localize(title)}</Text>}
      {children}
    </View>
  );
}
export function Field(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput placeholderTextColor="#697b70" {...props} style={s.input} />
  );
}
export function PasswordField(props: React.ComponentProps<typeof TextInput>) {
  const localize = useLocale();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ position: "relative" }}>
      <TextInput
        placeholderTextColor="#697b70"
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
            borderColor: "#697b70",
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
              borderColor: "#697b70",
              borderRadius: 4,
            }}
          />
          {visible && (
            <View
              style={{
                position: "absolute",
                width: 29,
                height: 2,
                backgroundColor: "#697b70",
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
            backgroundColor: "#243c3080",
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
                <Text
                  style={{
                    color: "#218653",
                    fontFamily: typography.fontFamily,
                    fontSize: 20,
                  }}
                >
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
  flat = false,
  backToServices = false,
}: {
  title?: string;
  children: React.ReactNode;
  auth?: boolean;
  processing?: boolean;
  branding?: React.ReactNode;
  flat?: boolean;
  backToServices?: boolean;
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
        : ["/fertilizer-calculator", "/pesticide-calculator"].includes(pathname)
          ? "/services"
          : pathname;
  if (auth && a.token) return <Redirect href="/home" />;
  if (!auth && !a.token) return <Redirect href="/login" />;
  return (
    <SafeAreaView
      style={[
        s.safe,
        flat && { backgroundColor: "#fff" },
        auth && { backgroundColor: "#edf7f0" },
      ]}
    >
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
              accessibilityLabel={localize(backToServices ? "Back to Services" : "Go back")}
              accessibilityRole="button"
              style={s.iconButton}
              onPress={() =>
                backToServices
                  ? router.dismissTo("/services")
                  : router.canGoBack()
                  ? router.back()
                  : a.go(auth ? "login" : "home")
              }
            >
              <Text style={s.heading}>←</Text>
            </Pressable>
            <View style={s.flex}>
              <View style={[s.row, { flexWrap: "nowrap" }]}>
                <LeafLogo />
                <Text style={[s.heading, { fontSize: 19, flexShrink: 1 }]}>{localize(brand.name)}</Text>
              </View>
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
          contentContainerStyle={[
            s.container,
            auth && s.authContainer,
            flat && { gap: 12, paddingHorizontal: 20 },
          ]}
        >
          {branding}
          {!!title && <Text style={pathname === "/home" || auth ? s.title : s.pageTitle}>{localize(title)}</Text>}
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
              color="#218653"
            />
          )}
        </ScrollView>
        {!auth && !processing && (
          <View style={s.nav}>
            {(
              [
                ["home", "Home"],
                ["market", "Market"],
                ["services", "Services"],
                ["farm", "Farm"],
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
                    (route === "farm" && activeRoute === "/farm-details") ||
                    (route === "profile" &&
                      [
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
                    (route === "farm" && activeRoute === "/farm-details") ||
                    (route === "profile" &&
                      [
                        "/language",
                        "/account-details",
                        "/security",
                      ].includes(activeRoute))) &&
                    s.navSelected,
                ]}
              >
                <View
                  style={[
                    s.navIcon,
                    (activeRoute === `/${route}` ||
                      (route === "farm" && activeRoute === "/farm-details") ||
                      (route === "profile" &&
                        ["/language", "/account-details", "/security"].includes(activeRoute))) &&
                      s.navIconSelected,
                  ]}
                >
                  <NavigationIcon
                    route={route}
                    selected={
                      activeRoute === `/${route}` ||
                      (route === "farm" && activeRoute === "/farm-details") ||
                      (route === "profile" &&
                        [
                          "/language",
                          "/account-details",
                          "/security",
                        ].includes(activeRoute))
                    }
                  />
                </View>
                <Text
                  style={[
                    s.navLabel,
                    (activeRoute === `/${route}` ||
                      (route === "farm" && activeRoute === "/farm-details") ||
                      (route === "profile" &&
                        [
                          "/language",
                          "/account-details",
                          "/security",
                        ].includes(activeRoute))) && {
                      color: "#17673f",
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
    justifyContent: "flex-start",
    maxWidth: 430,
    paddingVertical: 28,
    gap: 26,
  },
  authBrand: { alignItems: "center", gap: 10, marginTop: 4 },
  authCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e8e2", borderRadius: 24, paddingVertical: 26, paddingHorizontal: 22, gap: 16, boxShadow: "0 14px 40px rgba(20,35,68,0.07)" },
  brandTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 30,
    fontWeight: "600",
    color: "#243c30",
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
    backgroundColor: "#243c3080",
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
  navSelected: { borderRadius: 28 },
  navIconSelected: { backgroundColor: "#edf7f0" },
  navLabel: { color: "#20252c", fontFamily: typography.fontFamily, fontSize: 11, lineHeight: 16 },
  divider: { textAlign: "center", color: "#697b70" },
  safe: { flex: 1, backgroundColor: "#f6f9f6", width: "100%", maxWidth: 430, alignSelf: "center" },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
    paddingBottom: 36,
    maxWidth: 430,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e0e8e2",
  },
  title: {
    fontFamily: typography.fontFamily,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "600",
    color: "#243c30",
  },
  pageTitle: { fontFamily: typography.fontFamily, fontSize: 22, lineHeight: 30, fontWeight: "600", color: "#243c30", letterSpacing: -0.25 },
  heading: {
    fontFamily: typography.fontFamily,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    color: "#243c30",
  },
  body: {
    color: "#243c30",
    fontFamily: typography.fontFamily,
    fontSize: 16,
    lineHeight: 24,
  },
  muted: {
    color: "#697b70",
    fontFamily: typography.fontFamily,
    fontSize: 14,
    lineHeight: 22,
  },
  small: { color: "#218653", fontFamily: typography.fontFamily, fontSize: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e8e2",
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  hero: { borderRadius: 16, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 12, alignItems: "stretch" },
  soft: { backgroundColor: "#edf4e7", borderColor: "#edf4e7" },
  outline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cde4d5" },
  light: { backgroundColor: "#fff" },
  glass: { backgroundColor: "#ffffff09", borderWidth: 1, borderColor: "#fff" },
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
    borderColor: "#d5e1d8",
    borderRadius: 10,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    color: "#243c30",
    minHeight: 50,
  },
  button: {
    backgroundColor: "#218653",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontFamily: typography.fontFamily,
    fontSize: 15,
  },
  secondary: { backgroundColor: "#edf7f0" },
  language: {
    minHeight: 48,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d5e1d8",
    gap: 5,
  },
  selected: {
    backgroundColor: "#edf7f0",
    borderColor: "#218653",
    borderWidth: 2,
  },
  image: {
    width: "100%",
    height: 280,
    borderRadius: 20,
    resizeMode: "contain",
    backgroundColor: "#edf7f0",
  },
  error: { color: "#a12c22" },
  navIcon: {
    width: 40,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  nav: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c4dcf3",
    paddingHorizontal: 8,
    paddingVertical: 5,
    boxShadow: "0 2px 16px rgba(35, 78, 120, 0.16)",
    flexShrink: 0,
    flexDirection: "row",
    backgroundColor: "#e6f2ff",
    maxWidth: 398,
    width: "auto",
    alignSelf: "stretch",
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#edf7f0",
    borderWidth: 1,
    borderColor: "#cde4d5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#218653",
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  navItem: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 0,
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
});
