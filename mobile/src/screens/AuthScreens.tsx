import { useState } from "react";
import { Text, View } from "react-native";
import { brand, screens } from "../../../common/content.js";
import { copy } from "../../../common/copy.js";
import { useLeafCare } from "../state";
import { Button, Card, Field, Languages, Page, s } from "../ui";
export function LanguageScreen() {
  const a = useLeafCare();
  return (
    <Page auth title={screens.language}>
      <View style={{ alignItems: "center", gap: 16 }}>
        <Text style={{ fontSize: 70 }}>🌿</Text>
        <Text style={s.title}>{brand.name}</Text>
        <Text style={s.body}>Healthier Plants. Happier Tomorrows.</Text>
      </View>
      <Languages />
      <Button title="Continue →" onPress={() => a.go("login")} />
      <Text style={s.muted}>Plants understand care in every language</Text>
    </Page>
  );
}
export function AuthScreen({ register = false }: { register?: boolean }) {
  const a = useLeafCare();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const t = copy[a.lang];
  return (
    <Page auth title={register ? t.register : t.login}>
      <Text style={s.muted}>
        {register
          ? "Join LeafCare AI and start your plant care journey."
          : "Welcome back! Sign in to continue caring for your plants."}
      </Text>
      <Languages />
      <Card>
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
        <Field
          accessibilityLabel="Password"
          placeholder="Password (10+ characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
        />
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
        <Button
          secondary
          disabled={a.busy}
          title={register ? t.login : t.register}
          onPress={() => a.go(register ? "login" : "register")}
        />
      </Card>
      <Text style={s.muted}>Same planet. More green tomorrows.</Text>
    </Page>
  );
}
