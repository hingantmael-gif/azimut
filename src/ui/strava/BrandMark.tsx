import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../../constants/brand';
import { spacing } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeContext';
import { logoColorsForSurface } from '../../utils/logoColors';

type Size = 'sm' | 'md' | 'lg';

/** Glyphe Azimut seul (vortex) — fond transparent, pas de carré. */
const LOGO_GLYPH = require('../../../assets/azimut-mark.png');

const SIZES: Record<Size, { mark: number; word: number; gap: number }> = {
  sm: { mark: 28, word: 16, gap: 8 },
  md: { mark: 40, word: 22, gap: 10 },
  lg: { mark: 56, word: 34, gap: 12 },
};

export type AzimutMarkProps = {
  size?: number;
  /** Couleur du glyphe (auto si omis : blanc sur fond sombre, noir sur fond clair). */
  color?: string;
  /** Fond derrière le logo — sert uniquement au calcul auto de la couleur du glyphe. */
  surfaceColor?: string;
  /** @deprecated — préférer surfaceColor={BRAND.ink} */
  ink?: boolean;
};

/**
 * Logo Azimut = uniquement le vortex (partie blanche de la marque).
 * Pas de fond noir : le glyphe se pose directement sur la surface de l’écran.
 */
export function AzimutMark({
  size = 48,
  color,
  surfaceColor,
  ink = false,
}: AzimutMarkProps) {
  const { colors } = useThemeColors();
  const surface = surfaceColor ?? (ink ? BRAND.ink : colors.bg);
  const markColor = color ?? logoColorsForSurface(surface).mark;

  return (
    <Image
      source={LOGO_GLYPH}
      accessibilityLabel="Azimut"
      resizeMode="contain"
      style={{
        width: size,
        height: size,
        tintColor: markColor,
      }}
    />
  );
}

/** Marque + wordmark Azimut */
export function BrandMark({
  size = 'lg',
  ink = false,
  showWordmark = true,
  surfaceColor,
  markColor,
}: {
  size?: Size;
  ink?: boolean;
  showWordmark?: boolean;
  surfaceColor?: string;
  markColor?: string;
}) {
  const { colors } = useThemeColors();
  const s = SIZES[size];
  const surface = surfaceColor ?? (ink ? BRAND.ink : colors.bg);
  const autoMark = logoColorsForSurface(surface).mark;
  const glyphColor = markColor ?? autoMark;
  const wordColor = ink ? '#FFFFFF' : glyphColor === '#FFFFFF' ? colors.text : glyphColor;

  return (
    <View style={[styles.wrap, size === 'lg' && styles.wrapLg, { gap: s.gap }]}>
      <AzimutMark size={s.mark} color={glyphColor} surfaceColor={surface} ink={ink} />
      {showWordmark ? (
        <View>
          <Text style={[styles.wordmark, { fontSize: s.word, color: wordColor }]}>Azimut</Text>
          {size === 'lg' ? (
            <Text style={[styles.sub, ink ? styles.subInk : { color: colors.accent, opacity: 0.75 }]}>
              entraînement
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapLg: { marginBottom: spacing.md },
  wordmark: {
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  sub: {
    marginTop: -2,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  subInk: {
    color: BRAND.signalMint,
    opacity: 0.75,
  },
});
