import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { Analysis, ApiError, HistoryItem, Language, request } from './api';
import { copy } from './copy';

function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || pressed) && { opacity: 0.55 }]}><Text style={[s.buttonText, secondary && { color: '#176941' }]}>{title}</Text></Pressable>;
}

export default function LeafCareApp() {
  const [lang, setLang] = useState<Language>('en');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const operationRunning = useRef(false);
  const [photo, setPhoto] = useState<string>();
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<Analysis>();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyError, setHistoryError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const t = copy[lang];
  const out = result?.translations[lang];

  function clearSession() {
    void Speech.stop(); setToken(''); setPassword(''); setPhoto(undefined);
    setResult(undefined); setConsent(false); setHistory([]); setHistoryError('');
  }
  function fail(error: unknown) {
    if (error instanceof ApiError && error.status === 401 && token) {
      clearSession(); Alert.alert('Session expired', 'Please sign in again. Your saved analyses are in history.');
    } else Alert.alert('LeafCare AI', error instanceof Error ? error.message : 'Something went wrong. Please try again.');
  }
  async function run(action: () => Promise<void>) {
    if (operationRunning.current) return;
    operationRunning.current = true;
    setBusy(true);
    try { await action(); } catch (error) { fail(error); } finally { operationRunning.current = false; setBusy(false); }
  }
  async function loadHistory(accessToken = token) {
    setHistoryError('');
    try { setHistory(await request<HistoryItem[]>('/analyses', accessToken)); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      setHistoryError(error instanceof Error ? error.message : 'Could not load history.');
    }
  }
  function authenticate() { void run(async () => {
    if (!email.trim() || password.length < 10 || (register && name.trim().length < 2)) throw new Error('Enter a valid email, a password of 10–128 characters, and your name when registering.');
    if (register) {
      await request('/auth/register', '', { method: 'POST', body: JSON.stringify({ email: email.trim(), password, fullName: name.trim(), language: lang }) });
      setRegister(false); setPassword(''); Alert.alert('Account created', 'Sign in with your new account.'); return;
    }
    const data = await request<{ accessToken: string; user: { fullName: string } }>('/auth/login', '', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
    setToken(data.accessToken); setName(data.user.fullName); setPassword('');
    await loadHistory(data.accessToken);
  }); }
  function pick(camera: boolean) { void run(async () => {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Allow camera access in Settings, or choose an image from your gallery.');
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const selected = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (selected.canceled) return;
    const asset = selected.assets[0];
    if (asset.width < 300 || asset.height < 300) throw new Error('Choose a photo at least 300 × 300 pixels.');
    // Convert HEIC and large camera photos to the JPEG format accepted by the API.
    const resized = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: asset.width >= asset.height ? { width: Math.min(asset.width, 1600) } : { height: Math.min(asset.height, 1600) } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if ((resized.base64?.length || 0) * 0.75 > 4 * 1024 * 1024) throw new Error('Choose a smaller photo (maximum 4 MB).');
    setPhoto(resized.uri); setConsent(false); setResult(undefined); void Speech.stop();
  }); }
  function analyze() { void run(async () => {
    if (!photo || !consent) throw new Error('Choose a leaf photo and provide consent.');
    const form = new FormData();
    form.append('leaf', { uri: photo, name: 'leaf.jpg', type: 'image/jpeg' } as unknown as Blob);
    form.append('language', lang); form.append('consent', 'true');
    setResult(await request<Analysis>('/analyses', token, { method: 'POST', body: form }));
    await loadHistory();
  }); }
  function openHistory(item: HistoryItem) { void run(async () => {
    const data = await request<{ analysis_json: Analysis | string | null; status: string }>(`/analyses/${encodeURIComponent(item.id)}`, token);
    if (!data.analysis_json) throw new Error(`This analysis has no result yet (${data.status}).`);
    const parsed = typeof data.analysis_json === 'string' ? JSON.parse(data.analysis_json) : data.analysis_json;
    setResult({ ...parsed, id: item.id, status: data.status }); void Speech.stop();
    scroll.current?.scrollTo({ y: 0, animated: true });
  }); }
  const languages = <View style={s.row}>{(['en', 'te', 'hi'] as Language[]).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === lang }} onPress={() => { setLang(value); void Speech.stop(); }} style={[s.language, value === lang && s.selected]}><Text style={{ color: value === lang ? '#fff' : '#176941', fontWeight: '600' }}>{({ en: 'English', te: 'తెలుగు', hi: 'हिन्दी' })[value]}</Text></Pressable>)}</View>;

  return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="dark" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.container, !token && s.auth]}>
    <View style={s.brand}><Text style={s.logo}>🌿</Text><Text style={s.title}>{t.title}</Text><Text style={s.muted}>{token ? name : t.sub}</Text></View>
    {languages}
    {!token ? <View style={s.card}>
      <Text style={s.heading}>{register ? t.register : t.login}</Text>
      {register && <TextInput accessibilityLabel="Full name" placeholder="Full name" placeholderTextColor="#708078" value={name} onChangeText={setName} autoComplete="name" maxLength={150} style={s.input} />}
      <TextInput accessibilityLabel="Email" placeholder="Email" placeholderTextColor="#708078" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={255} style={s.input} />
      <TextInput accessibilityLabel="Password" placeholder="Password (10+ characters)" placeholderTextColor="#708078" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={register ? 'new-password' : 'current-password'} maxLength={128} style={s.input} />
      <Button disabled={busy} title={register ? t.register : t.login} onPress={authenticate} />
      <Button disabled={busy} secondary title={register ? t.login : t.register} onPress={() => setRegister(!register)} />
    </View> : <>
      <LinearGradient colors={['#dff5df', '#f8f1d7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}><Text style={s.eyebrow}>AI PLANT HEALTH ASSISTANT</Text><Text style={s.title}>{t.sub}</Text><Text style={s.body}>{t.tip}</Text></LinearGradient>
      <View style={s.card}><Text style={s.heading}>{t.upload}</Text>
        <View style={s.drop}>{photo ? <Image source={{ uri: photo }} accessibilityLabel="Selected leaf photo" style={s.image} /> : <><Text style={s.logo}>📷</Text><Text style={s.muted}>Camera or gallery</Text></>}</View>
        <View style={s.row}><View style={s.flex}><Button title="Camera" onPress={() => pick(true)} disabled={busy} secondary /></View><View style={s.flex}><Button title="Gallery" onPress={() => pick(false)} disabled={busy} secondary /></View></View>
        <View style={s.row}><Switch accessibilityLabel={t.consent} value={consent} onValueChange={setConsent} disabled={busy} trackColor={{ true: '#18794e' }} /><Text style={[s.body, s.flex]}>{t.consent}</Text></View>
        <Button title={t.analyze} onPress={analyze} disabled={busy || !photo || !consent} />
      </View>
      <View style={s.card}>{out && result ? <>
        <Text style={s.eyebrow}>RESULT · {result.status}</Text><Text style={s.title}>{result.plant}</Text><Text style={s.muted}>{result.scientific_name}</Text>
        <Text style={[s.badge, ['HIGH', 'CRITICAL'].includes(result.severity) && { backgroundColor: '#ffe2dd', color: '#9c291d' }]}>{result.severity}</Text>
        <Text style={s.heading}>{result.condition} · {Math.round(result.confidence * 100)}%</Text><Text style={s.body}>{out.summary}</Text>
        <Text style={s.heading}>Visible symptoms</Text>{out.symptoms.map((text, i) => <Text style={s.body} key={i}>• {text}</Text>)}
        <Text style={s.heading}>Recommended actions</Text>{out.actions.map((text, i) => <Text style={s.body} key={i}>{i + 1}. {text}</Text>)}
        <Button secondary title="Read result aloud" onPress={() => { void Speech.stop().then(() => Speech.speak(`${out.summary}. ${out.actions.join('. ')}`, { language: `${lang}-IN`, onError: () => Alert.alert('Speech unavailable', 'Install a voice for this language in your device settings.') })); }} />
        <Button secondary title="Stop reading" onPress={() => { void Speech.stop(); }} /><Text style={s.muted}>{out.disclaimer}</Text>
      </> : <><Text style={s.logo}>🍃</Text><Text style={s.heading}>Your analysis will appear here</Text><Text style={s.muted}>Upload a clear leaf image to identify likely disease, pest, nutrient, or environmental stress.</Text></>}</View>
      <View style={s.card}><Text style={s.heading}>{t.history}</Text><Button secondary title="Refresh history" disabled={busy} onPress={() => { void run(() => loadHistory()); }} />
        {!!historyError && <Text accessibilityRole="alert" style={s.error}>{historyError}</Text>}
        {!history.length && !historyError && <Text style={s.muted}>No analyses yet.</Text>}
        {history.map(item => <Pressable accessibilityRole="button" disabled={busy} key={item.id} style={s.history} onPress={() => openHistory(item)}><Text style={s.heading}>🌱 {item.plant_name || 'Unidentified plant'}</Text><Text style={s.muted}>{item.disease_name || item.status}</Text><Text style={s.muted}>{new Date(item.created_at).toLocaleDateString()}</Text></Pressable>)}
      </View>
      <Button secondary title="Sign out" disabled={busy} onPress={() => { void run(async () => { await request('/auth/logout', token, { method: 'POST' }); clearSession(); }); }} />
    </>}
    {busy && <View accessibilityLiveRegion="polite" style={s.row}><ActivityIndicator color="#18794e" /><Text style={s.muted}>Working…</Text></View>}
  </ScrollView></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8f1' }, container: { padding: 20, gap: 20, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  auth: { flexGrow: 1, justifyContent: 'center' }, brand: { alignItems: 'center', gap: 6 }, logo: { fontSize: 46, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: '#18352a' }, heading: { fontSize: 19, fontWeight: '700', color: '#18352a' },
  body: { color: '#18352a', fontSize: 15, lineHeight: 23 }, muted: { color: '#708078', fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce7dc', borderRadius: 20, padding: 22, gap: 14 },
  hero: { padding: 26, borderRadius: 24, gap: 12 }, eyebrow: { color: '#18794e', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }, flex: { flex: 1 },
  input: { padding: 14, borderWidth: 1, borderColor: '#cbd8cd', borderRadius: 11, color: '#18352a', fontSize: 16 },
  button: { backgroundColor: '#18794e', padding: 15, borderRadius: 12, alignItems: 'center', minHeight: 48 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }, secondary: { backgroundColor: '#e4f3e9' },
  language: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#e4f3e9' }, selected: { backgroundColor: '#18794e' },
  drop: { height: 240, borderWidth: 2, borderStyle: 'dashed', borderColor: '#9bc7a6', borderRadius: 18, backgroundColor: '#f5fbf5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, image: { width: '100%', height: '100%', resizeMode: 'contain' },
  badge: { alignSelf: 'flex-start', borderRadius: 20, padding: 9, backgroundColor: '#fff3cb', color: '#805c00', fontWeight: '800' }, history: { borderTopWidth: 1, borderColor: '#edf1ed', paddingTop: 14, gap: 4 }, error: { color: '#9c291d' },
});
