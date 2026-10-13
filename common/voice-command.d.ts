import type { Language } from './types';
export function resolveVoiceCommand(transcript: string): { intent: string; language?: Language; full?: boolean };
