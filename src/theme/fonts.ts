import { Platform } from 'react-native';
import type { FontChoice } from './customTheme';

/** Famille de police du système pour les choix hors Manrope (null = police standard de l'app). */
export function systemFontFamily(font: FontChoice): string | null {
  if (font === 'standard') return null;
  if (font === 'serif') return Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) ?? 'serif';
  if (font === 'mono') return Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' }) ?? 'monospace';
  return Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui, -apple-system, "Segoe UI", sans-serif' }) ?? 'System';
}
