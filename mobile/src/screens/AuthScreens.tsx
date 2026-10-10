import { useLocale } from "../locale";
import { useState } from "react";
import { Text, View } from "react-native";
import { copy } from "../../../common/copy.js";
import { useLeafCare } from "../state";
import { AuthBrand, Button, Card, Field, PasswordField, Languages, Page, LeafLogo, s } from "../ui";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const localize = useLocale();
  const a = useLeafCare();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const t = copy[a.lang];
  return (
    <Page auth branding={<AuthBrand register={register} />} title={localize(register ? t.register : t.login)}>
      <Text style={s.muted}>
        {localize(register
          ? "Join Krishi Karshak and start your plant care journey."
          : "Welcome back! Sign in to continue caring for your plants.")}
      </Text>
      <Card>
        {register && <Text style={s.body}>{localize("Full name")}</Text>}
        {register && (
          <Field
            accessibilityLabel={localize("Full name")}
            placeholder={localize("Full name")}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={150}
          />
        )}
        <Text style={s.body}>{localize("Email address")}</Text>
        <Field
          accessibilityLabel={localize("Email")}
          placeholder={localize("Email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={255}
        />
        <Text style={s.body}>{localize("Password")}</Text>
        <PasswordField
          accessibilityLabel={localize("Password")}
          placeholder={localize("Password (10+ characters)")}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
        />
        {!register && <Button secondary title={localize("Forgot password?")} onPress={() => a.go("forgot")} />}
        <Button
          disabled={a.busy}
          title={localize(register ? t.register : t.login)}
          onPress={() => {
            void a
              .authenticate(email, password, name, register)
              .then((success) => {
                if (success) setPassword("");
              });
          }}
        />
      </Card>
      <Text style={s.divider}>{localize("or")}</Text>
        <Button
          secondary
          disabled={a.busy}
          title={localize(register ? t.login : t.register)}
          onPress={() => a.go(register ? "login" : "register")}
        />
      <Languages />
      <View style={{ alignItems: "center", gap: 8 }}><LeafLogo /><Text style={s.muted}>{localize("Your plants. Your care. All in one place.")}</Text></View>
    </Page>
  );
}

export function RecoveryScreen() {
  const localize = useLocale();
  const a = useLeafCare();
  const [stage, setStage] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return <Page auth title={localize(stage ? "Create a new password" : "Forgot your password?")}>
    <LeafLogo large />
    <Text style={s.muted}>{localize(stage ? "Paste the recovery code from your email. Your new password needs at least 10 characters." : "Enter your account email to receive a recovery code valid for 15 minutes.")}</Text>
    <Card>
      {stage ? <>
        <Text style={s.body}>{localize("Recovery code")}</Text><Field value={token} onChangeText={setToken} autoCapitalize="none" maxLength={2048} accessibilityLabel={localize("Recovery code")} />
        <Text style={s.body}>{localize("New password")}</Text><PasswordField value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel={localize("New password")} />
        <Text style={s.body}>{localize("Confirm password")}</Text><PasswordField value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel={localize("Confirm password")} />
      </> : <><Text style={s.body}>{localize("Email address")}</Text><Field value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" maxLength={255} accessibilityLabel={localize("Email address")} /></>}
      <Button disabled={a.busy} title={localize(stage ? "Reset password" : "Send recovery code")} onPress={() => {
        if (stage) { if (password !== confirm) { a.setError("Passwords do not match."); return; } void a.resetPassword(token, password); }
        else void a.recover(email).then(ok => { if (ok) setStage(true); });
      }} />
      <Button secondary disabled={a.busy} title={localize(stage ? "Request a new code" : "Already have a recovery code?")} onPress={() => { a.setError(""); setStage(!stage); }} />
    </Card>
    <Button secondary disabled={a.busy} title={localize("Back to sign in")} onPress={() => a.go("login")} />
  </Page>;
}
