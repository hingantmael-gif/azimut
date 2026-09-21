import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts } from '../theme/tokens';
import { useCustomTheme } from '../theme/ThemeContext';
import { TEXT_SCALE } from '../theme/customTheme';
import { systemFontFamily } from '../theme/fonts';

/** `fontWeight` CSS → famille Manrope (une famille par graisse, requis sur natif). */
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  normal: fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
  bold: fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
};

/**
 * Remplace `Text` de react-native : applique la police Mova selon le `fontWeight`
 * déjà écrit dans les styles (aucun écran à réécrire), sauf si une `fontFamily`
 * est fournie explicitement (chiffres tabulaires, monospace…).
 * Personnalisation Premium : autre police (système, serif, mono) et taille du texte.
 */
export const Text = forwardRef<RNText, TextProps>(function MovaText({ style, ...rest }, ref) {
  const custom = useCustomTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  const scale = custom ? TEXT_SCALE[custom.textScale] : 1;
  const alt = custom ? systemFontFamily(custom.font) : null;

  const sizing: TextStyle | null =
    scale !== 1
      ? { fontSize: (flat.fontSize ?? 14) * scale, ...(flat.lineHeight ? { lineHeight: flat.lineHeight * scale } : null) }
      : null;

  const explicit = flat.fontFamily;
  // Une famille explicite qui n'est pas Manrope (monospace, chiffres tabulaires…) est toujours respectée.
  if (explicit && !explicit.startsWith('Manrope')) {
    return <RNText ref={ref} style={[style, sizing]} {...rest} />;
  }
  if (alt) {
    const w = String(flat.fontWeight ?? (explicit === fonts.extrabold ? '800' : explicit === fonts.bold ? '700' : explicit === fonts.semibold ? '600' : explicit === fonts.medium ? '500' : '400'));
    return <RNText ref={ref} style={[style, sizing, { fontFamily: alt, fontWeight: w as TextStyle['fontWeight'] }]} {...rest} />;
  }
  if (explicit) {
    return <RNText ref={ref} style={[style, sizing]} {...rest} />;
  }
  const family = FAMILY_BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? fonts.regular;
  return (
    <RNText
      ref={ref}
      // `fontWeight: 'normal'` : la graisse est déjà dans la famille (évite un faux gras Android).
      style={[style, sizing, { fontFamily: family, fontWeight: 'normal' }]}
      {...rest}
    />
  );
});
