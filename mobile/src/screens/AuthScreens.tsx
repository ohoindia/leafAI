import { useLocale } from "../locale";
import { useRef, useState } from "react";
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
  const [guid, setGuid] = useState(""); const [delivery, setDelivery] = useState(true); const [testOtp, setTestOtp] = useState("");
  const [checking, setChecking] = useState(false); const [resetPin, setResetPin] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const title = stage === "otp" ? "Verify OTP" : stage === "pin" ? "Set your PIN" : "Sign in or create an account";
  async function checkMobile(value: string) {
    lookup.current?.abort(); const controller=new AbortController();lookup.current=controller;
    const digits=value.replace(/\D/g, "").slice(0,10);
    setMobile(digits);setStage("mobile");setPin("");setConfirm("");setName("");setGuid("");setTestOtp("");setResetPin(false);a.setError("");setChecking(false);
    if(digits.length!==10)return;
    if(!/^[6-9]\d{9}$/.test(digits)){a.setError("Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.");return;}
    setChecking(true);
    try {const result=await request<{profileCreated:boolean}>(endpoints.checkMobile,"",{method:"POST",body:JSON.stringify({mobileNumber:digits}),signal:controller.signal});if(!controller.signal.aborted)setStage(result.profileCreated?"login-pin":"request");}
    catch(e){if(!controller.signal.aborted)a.setError(e instanceof Error?e.message:"Unable to check mobile number.");}
    finally{if(!controller.signal.aborted)setChecking(false);}
  }
  async function sendOtp(reset=false) {
    if(checking)return;
    if(!reset&&name.trim().length<2){a.setError("Enter your full name to complete registration.");return;}
    await a.run(async()=>{const result=await request<{guid:string;deliveryEnabled:boolean;testOtp?:string}>(endpoints.requestOtp,"",{method:"POST",body:JSON.stringify({mobileNumber,resetPin:reset})});setGuid(result.guid);setDelivery(result.deliveryEnabled);setTestOtp(result.testOtp||"");setResetPin(reset);setOtp("");setStage("otp");});
  }
  async function next() {
    if(checking||a.busy)return;
    if(stage==="mobile"){await checkMobile(mobileNumber);return;}
    if(stage==="request"){await sendOtp();return;}
    if((stage==="login-pin"||stage==="pin")&&!/^\d{4}$/.test(pin)){a.setError("Enter a valid four-digit PIN.");return;}
    if(stage==="login-pin"){await a.authenticate(mobileNumber,pin,true);return;}
    if(stage==="pin"){if(pin!==confirm){a.setError("PINs do not match.");return;}await a.authenticate(guid,pin);return;}
    await a.run(async()=>{await request(endpoints.verifyOtp,"",{method:"POST",body:JSON.stringify({guid,otp,...(!resetPin?{fullName:name}:{})})});setOtp("");setStage("pin");});
  }
  return <Page auth branding={<AuthBrand register={register} />} title={localize(title)}>
    <Card>
      {["mobile","request","login-pin"].includes(stage) && <>
        <Text style={s.small}>{localize("Account access")}</Text>
        <Text style={s.heading}>{localize("Welcome to Krishi Karshak")}</Text>
        <Text style={s.muted}>{localize("Enter your mobile number to sign in or create an account.")}</Text>
        <Text style={s.body}>{localize("Enter mobile number")} <Text style={{ color: "#b42318" }}>*</Text></Text>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#d6e2ec", borderRadius: 12, paddingHorizontal: 14, minHeight: 54 }}>
          <Text accessibilityLabel="Country code +91" style={{ color: "#142b41", fontSize: 16, borderRightWidth: 1, borderRightColor: "#d6e2ec", paddingRight: 12, marginRight: 12 }}>+91</Text>
          <TextInput style={{ flex: 1, minWidth: 0, paddingVertical: 14, color: "#142b41", fontSize: 16 }} value={mobileNumber.replace(/(\d{5})(\d+)/, "$1 $2")} onChangeText={value => void checkMobile(value)} keyboardType="phone-pad" autoComplete="tel-national" maxLength={11} placeholder={localize("Enter mobile number")} placeholderTextColor="#63758a" editable={!a.busy} accessibilityLabel={localize("Mobile number")} />
        </View>
      </>}

      {checking && <Text style={s.muted}>{localize("Checking mobile number...")}</Text>}
      {stage === "login-pin" && <>
        <Text style={s.body}>{localize("Enter 4-digit PIN")}</Text><PasswordField value={pin} onChangeText={value=>setPin(value.replace(/\D/g,""))} keyboardType="number-pad" maxLength={4} autoComplete="current-password" accessibilityLabel={localize("Enter 4-digit PIN")} />
        <Button secondary disabled={a.busy||checking} title={localize("Forgot PIN? Request OTP")} onPress={()=>void sendOtp(true)}/>
      </>}
      {stage === "request" && <><Text style={s.muted}>{localize("Create your profile with OTP verification.")}</Text><Text style={s.body}>{localize("Full name")}</Text><Field value={name} onChangeText={setName} maxLength={150} autoComplete="name" accessibilityLabel={localize("Full name")}/></>}
      {stage === "otp" && <>
        <Text style={s.body}>{localize("OTP")}</Text><Field value={otp} onChangeText={setOtp} keyboardType="number-pad" autoComplete="sms-otp" maxLength={6} accessibilityLabel={localize("OTP")} />
        {!resetPin && <><Text style={s.body}>{localize("Full name")}</Text><Field value={name} onChangeText={setName} maxLength={150} autoComplete="name" accessibilityLabel={localize("Full name")} /></>}
        {!delivery && !!testOtp && <Text accessibilityLiveRegion="polite" style={s.body}>{localize("Test OTP")}: <Text style={{ fontWeight: "700" }}>{testOtp}</Text></Text>}
      </>}
      {stage === "pin" && <>
        <Text style={s.body}>{localize("Set 4-digit PIN")}</Text><PasswordField value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} accessibilityLabel={localize("Set 4-digit PIN")} />
        <Text style={s.body}>{localize("Confirm PIN")}</Text><PasswordField value={confirm} onChangeText={setConfirm} keyboardType="number-pad" maxLength={4} accessibilityLabel={localize("Confirm PIN")} />
      </>}
      <Button disabled={a.busy||checking} title={localize(stage==="mobile"?"Continue":stage==="request"?"Request OTP":stage==="login-pin"?"Sign in":stage==="otp"?"Verify OTP":"Save and sign in")} onPress={()=>void next()}/>
      {["otp","pin"].includes(stage)&&<Button secondary disabled={a.busy} title={localize("Back to mobile number")} onPress={()=>void checkMobile(mobileNumber)}/>}
    </Card><Languages />
  </Page>;
}

export function RecoveryScreen() { return <AuthScreen />; }
