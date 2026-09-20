import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

/** Synthèse vocale du coach (téléphone : expo-speech ; navigateur : speechSynthesis). Jamais bloquant. */
const KEY = 'mova-voice-coach';

export function isVoiceCoachOn(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setVoiceCoachOn(on: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

export function speak(text: string): void {
  try {
    if (Platform.OS === 'web') {
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 1.05;
      synth.speak(u);
      return;
    }
    void Speech.stop();
    Speech.speak(text, { language: 'fr-FR', rate: 1.02 });
  } catch {
    /* audio indisponible : on continue sans voix */
  }
}
