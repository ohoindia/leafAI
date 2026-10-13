import { translate } from './locale.js';

// Both spoken input and translated command buttons use this same resolver.
export function resolveVoiceCommand(transcript) {
  const text = String(transcript).trim().toLowerCase();
  for (const [label, command] of [
    ['Open history', { intent: 'history' }],
    ['Explain in Telugu', { intent: 'language', language: 'te' }],
    ['Show treatment steps', { intent: 'read_result', full: true }],
    ['Read my result', { intent: 'read_result', full: false }],
  ]) {
    if (['en', 'te', 'hi', 'kn', 'ta'].some(code => translate(code, label).toLowerCase() === text)) return command;
  }
  if (/history|చరిత్ర|इतिहास|ಇತಿಹಾಸ|வரலாறு/i.test(text)) return { intent: 'history' };
  for (const [language, pattern] of [
    ['te', /telugu|తెలుగు/i], ['hi', /hindi|हिंदी/i],
    ['kn', /kannada|ಕನ್ನಡ/i], ['ta', /tamil|தமிழ்/i], ['en', /english|ఆంగ్లం|अंग्रेज़ी|ಇಂಗ್ಲಿಷ್|ஆங்கிலம்/i],
  ]) if (pattern.test(text)) return { intent: 'language', language };
  if (/treat|steps|చికిత్స|उपचार|ಚಿಕಿತ್ಸೆ|சிகிச்சை/i.test(text)) return { intent: 'read_result', full: true };
  if (/read|result|చదువు|పలితం|ఫలితం|पढ़|परिणाम|ಫಲಿತಾಂಶ|முடிவு/i.test(text)) return { intent: 'read_result', full: false };
  if (/analy|విశ్లేష|विश्लेष|ವಿಶ್ಲೇಷ|பகுப்பாய்வு/i.test(text)) return { intent: 'analyze' };
  return { intent: 'unknown' };
}
