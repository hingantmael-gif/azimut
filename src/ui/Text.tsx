import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { fonts } from '../theme/tokens';

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
 */
export const Text = forwardRef<RNText, TextProps>(function MovaText({ style, ...rest }, ref) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) {
    return <RNText ref={ref} style={style} {...rest} />;
  }
  const family = FAMILY_BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? fonts.regular;
  return (
    <RNText
      ref={ref}
      // `fontWeight: 'normal'` : la graisse est déjà dans la famille (évite un faux gras Android).
      style={[style, { fontFamily: family, fontWeight: 'normal' }]}
      {...rest}
    />
  );
});
