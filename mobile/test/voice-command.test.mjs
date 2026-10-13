import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveVoiceCommand } from '../../common/voice-command.js';
import { translate } from '../../common/locale.js';

test('web and mobile command resolver accepts every translated command button', () => {
  for (const language of ['en', 'te', 'hi', 'kn', 'ta']) {
    for (const [label, expected] of [
      ['Open history', { intent: 'history' }],
      ['Explain in Telugu', { intent: 'language', language: 'te' }],
      ['Show treatment steps', { intent: 'read_result', full: true }],
      ['Read my result', { intent: 'read_result', full: false }],
    ]) assert.deepEqual(resolveVoiceCommand(translate(language, label)), expected);
  }
  assert.deepEqual(resolveVoiceCommand('ವಿಶ್ಲೇಷಣೆ'), { intent: 'analyze' });
  assert.deepEqual(resolveVoiceCommand('பகுப்பாய்வு'), { intent: 'analyze' });
  assert.deepEqual(resolveVoiceCommand('  ENGLISH  '), { intent: 'language', language: 'en' });
  assert.deepEqual(resolveVoiceCommand('unrelated request'), { intent: 'unknown' });
});
