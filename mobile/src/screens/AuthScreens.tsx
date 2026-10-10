import { useState } from "react";
import { Text, View } from "react-native";
import { copy } from "../../../common/copy.js";
import { useLeafCare } from "../state";
import { AuthBrand, Button, Card, Field, PasswordField, Languages, Page, LeafLogo, s } from "../ui";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const a = useLeafCare();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const t = copy[a.lang];
  return (
    <Page auth branding={<AuthBrand register={register} />} title={register ? t.register : t.login}>
      <Text style={s.muted}>
        {register
          ? "Join Krishi Karshak and start your plant care journey."
          : "Welcome back! Sign in to continue caring for your plants."}
      </Text>
      <Card>
        {register && <Text style={s.body}>Full name</Text>}
        {register && (
          <Field
            accessibilityLabel="Full name"
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={150}
          />
        )}
        <Text style={s.body}>Email address</Text>
        <Field
          accessibilityLabel="Email"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          maxLength={255}
        />
        <Text style={s.body}>Password</Text>
        <PasswordField
          accessibilityLabel="Password"
          placeholder="Password (10+ characters)"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
        />
        {!register && <Button secondary title="Forgot password?" onPress={() => a.go("forgot")} />}
        <Button
          disabled={a.busy}
          title={register ? t.register : t.login}
          onPress={() => {
            void a
              .authenticate(email, password, name, register)
              .then((success) => {
                if (success) setPassword("");
              });
          }}
        />
      </Card>
      <Text style={s.divider}>or</Text>
        <Button
          secondary
          disabled={a.busy}
          title={register ? t.login : t.register}
          onPress={() => a.go(register ? "login" : "register")}
        />
      <Languages />
      <View style={{ alignItems: "center", gap: 8 }}><LeafLogo /><Text style={s.muted}>Your plants. Your care. All in one place.</Text></View>
    </Page>
  );
}

export function RecoveryScreen() {
  const a = useLeafCare();
  const [stage, setStage] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return <Page auth title={stage ? "Create a new password" : "Forgot your password?"}>
    <LeafLogo large />
    <Text style={s.muted}>{stage ? "Paste the recovery code from your email. Your new password needs at least 10 characters." : "Enter your account email to receive a recovery code valid for 15 minutes."}</Text>
    <Card>
      {stage ? <>
        <Text style={s.body}>Recovery code</Text><Field value={token} onChangeText={setToken} autoCapitalize="none" maxLength={2048} accessibilityLabel="Recovery code" />
        <Text style={s.body}>New password</Text><PasswordField value={password} onChangeText={setPassword} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel="New password" />
        <Text style={s.body}>Confirm password</Text><PasswordField value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoComplete="new-password" maxLength={128} accessibilityLabel="Confirm password" />
      </> : <><Text style={s.body}>Email address</Text><Field value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" maxLength={255} accessibilityLabel="Email address" /></>}
      <Button disabled={a.busy} title={stage ? "Reset password" : "Send recovery code"} onPress={() => {
        if (stage) { if (password !== confirm) { a.setError("Passwords do not match."); return; } void a.resetPassword(token, password); }
        else void a.recover(email).then(ok => { if (ok) setStage(true); });
      }} />
      <Button secondary disabled={a.busy} title={stage ? "Request a new code" : "Already have a recovery code?"} onPress={() => { a.setError(""); setStage(!stage); }} />
    </Card>
    <Button secondary disabled={a.busy} title="Back to sign in" onPress={() => a.go("login")} />
  </Page>;
}
