import { useLocale } from "../locale";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { endpoints } from "../../../common/api.js";
import { request } from "../api";
import { useLeafCare } from "../state";
import { AuthBrand, Button, Card, Field, PasswordField, Languages, Page, s } from "../ui";
export function AuthScreen({ register = false }: { register?: boolean }) {
  const localize = useLocale(); const a = useLeafCare();
  const [stage, setStage] = useState("mobile");
  const [mobileNumber, setMobile] = useState(""); const [otp, setOtp] = useState("");
  const [name, setName] = useState(""); const [pin, setPin] = useState(""); const [confirm, setConfirm] = useState("");
  const [guid, setGuid] = useState(""); const [delivery, setDelivery] = useState(true);
  const title = stage === "mobile" ? "Enter mobile number" : stage === "otp" ? "Verify OTP and enter name" : "Set your PIN";
  async function next() {
    if (stage === "pin") { if (pin !== confirm) { a.setError("PINs do not match."); return; } await a.authenticate(guid, pin); return; }
    await a.run(async () => {
      if (stage === "mobile") {
        const result = await request<{ guid: string; deliveryEnabled: boolean }>(endpoints.requestOtp, "", { method: "POST", body: JSON.stringify({ mobileNumber }) });
        setGuid(result.guid); setDelivery(result.deliveryEnabled); setStage("otp");
      } else {
        await request(endpoints.verifyOtp, "", { method: "POST", body: JSON.stringify({ guid, otp, fullName: name }) });
        setOtp(""); setStage("pin");
      }
    });
  }
  return <Page auth branding={<AuthBrand register={register} />} title={localize(title)}>
    <Card>
      {stage === "mobile" && <>
        <Text style={s.small}>{localize("Account access")}</Text>
        <Text style={s.heading}>{localize("Welcome to Krishi Karshak")}</Text>
        <Text style={s.muted}>{localize("Enter your mobile number to continue caring for your plants.")}</Text>
        <Text style={s.body}>{localize("Enter mobile number")} <Text style={{ color: "#b42318" }}>*</Text></Text>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#d6e2ec", borderRadius: 12, paddingHorizontal: 14, minHeight: 54 }}>
          <Text accessibilityLabel="Country code +91" style={{ color: "#142b41", fontSize: 16, borderRightWidth: 1, borderRightColor: "#d6e2ec", paddingRight: 12, marginRight: 12 }}>+91</Text>
          <TextInput style={{ flex: 1, minWidth: 0, paddingVertical: 14, color: "#142b41", fontSize: 16 }} value={mobileNumber.replace(/(\d{5})(\d+)/, "$1 $2")} onChangeText={value => { setMobile(value.replace(/\D/g, "").slice(0, 10)); a.setError(""); }} keyboardType="phone-pad" autoComplete="tel-national" maxLength={11} placeholder={localize("Enter mobile number")} placeholderTextColor="#63758a" editable={!a.busy} accessibilityLabel={localize("Mobile number")} />
        </View>
      </>}

      {stage === "otp" && <>
        <Text style={s.body}>{localize("OTP")}</Text><Field value={otp} onChangeText={setOtp} keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} accessibilityLabel={localize("OTP")} />
        <Text style={s.body}>{localize("Full name")}</Text><Field value={name} onChangeText={setName} maxLength={150} autoComplete="name" accessibilityLabel={localize("Full name")} />
        {!delivery && <Text style={s.muted}>{localize("SMS delivery is disabled. Contact your administrator for the test OTP.")}</Text>}
      </>}
      {stage === "pin" && <>
        <Text style={s.body}>{localize("Set 4-digit PIN")}</Text><PasswordField value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} accessibilityLabel={localize("Set 4-digit PIN")} />
        <Text style={s.body}>{localize("Confirm PIN")}</Text><PasswordField value={confirm} onChangeText={setConfirm} keyboardType="number-pad" maxLength={4} accessibilityLabel={localize("Confirm PIN")} />
      </>}
      <Button disabled={a.busy} title={localize(stage === "mobile" ? "Request OTP" : stage === "otp" ? "Verify OTP" : "Save and sign in")} onPress={() => void next()} />
      {stage !== "mobile" && <Button secondary disabled={a.busy} title={localize("Change number / request new OTP")} onPress={() => { setStage("mobile"); setGuid(""); setOtp(""); setPin(""); setConfirm(""); a.setError(""); }} />}
    </Card><Languages />
  </Page>;
}

export function RecoveryScreen() { return <AuthScreen />; }
