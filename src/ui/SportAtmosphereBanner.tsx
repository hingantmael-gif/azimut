import { useMemo, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import type { ColorPalette } from '../theme/palettes';

/**
 * Bandeau photo pour écrans trop « vides » — modernise sans surcharge.
 * `position: 'relative'` obligatoire : sinon Image/scrim en absoluteFill
 * se calent sur PhoneShell (web) et bloquent tous les boutons.
 * Passe `onPress` pour le rendre cliquable (ex. import Strava).
 */
export function SportAtmosphereBanner({
  source,
  title,
  subtitle,
  height = 148,
  onPress,
}: {
  source: ImageSourcePropType;
  title: string;
  subtitle?: string;
  height?: number;
  onPress?: () => void;
}) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors, height), [colors, height]);

  const body: ReactNode = (
    <>
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        pointerEvents="none"
      />
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.textBlock} pointerEvents="none">
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.wrap, pressed && styles.wrapPressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={title}
      pointerEvents="box-none"
    >
      {body}
    </View>
  );
}

function makeStyles(colors: ColorPalette, height: number) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      height,
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.bgElevated,
      zIndex: 0,
    },
    wrapPressed: {
      opacity: 0.92,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
      zIndex: 0,
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8, 16, 28, 0.45)',
      zIndex: 1,
    },
    textBlock: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: spacing.md,
      zIndex: 2,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    sub: {
      color: 'rgba(255,255,255,0.88)',
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
      fontWeight: '500',
    },
  });
}
