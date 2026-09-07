import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ProgramSportCategory } from '../../constants/programs';
import {
  COVER_CROP_CENTER,
  coverCropImageStyle,
  imageForProgram,
  programImageFocus,
} from '../../constants/sportVisuals';

/**
 * Fond photo sport — cover centré (même rognage L/R et H/B).
 * Sur téléphone l’athlète reste au milieu au lieu d’être étiré ou décalé.
 */
export function SportCover({
  source,
  focus,
  objectPosition,
  style,
  children,
  scrim = 'rgba(7,17,31,0.42)',
  minHeight = 140,
  borderRadius,
  contentStyle,
}: {
  source: ImageSourcePropType;
  focus?: 'center' | 'athlete' | 'upper';
  /** CSS object-position (web) — ex. "50% 50%" */
  objectPosition?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scrim?: string;
  minHeight?: number;
  borderRadius?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const pos =
    objectPosition ??
    (focus === 'upper' ? '50% 28%' : focus === 'athlete' ? '50% 35%' : COVER_CROP_CENTER);

  return (
    <View style={[styles.wrap, { minHeight, borderRadius }, style]}>
      <Image
        source={source}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[styles.image, coverCropImageStyle(pos)]}
      />
      <View style={[styles.scrim, { backgroundColor: scrim }]} pointerEvents="none" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

export function ProgramSportCover({
  sportCategory,
  catalogId,
  ...rest
}: {
  sportCategory?: string | null;
  catalogId?: string | null;
} & Omit<
  {
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    scrim?: string;
    minHeight?: number;
    borderRadius?: number;
    focus?: 'center' | 'athlete' | 'upper';
    objectPosition?: string;
    contentStyle?: StyleProp<ViewStyle>;
  },
  never
>) {
  const cat = (sportCategory ?? 'run') as ProgramSportCategory;
  const source = imageForProgram(cat, catalogId ?? undefined);
  const objectPosition = rest.objectPosition ?? programImageFocus(catalogId);
  return <SportCover source={source} {...rest} objectPosition={objectPosition} />;
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    zIndex: 1,
    padding: 16,
  },
});
