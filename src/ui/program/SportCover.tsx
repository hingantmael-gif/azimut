import type { ReactNode } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ProgramSportCategory } from '../../constants/programs';
import { imageForProgram, programImageFocus } from '../../constants/sportVisuals';

/**
 * Fond photo sport — image nette (cover), focus visage si catalogue connu.
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
}: {
  source: ImageSourcePropType;
  focus?: 'center' | 'athlete' | 'upper';
  /** CSS object-position (web) — ex. "50% 28%" */
  objectPosition?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scrim?: string;
  minHeight?: number;
  borderRadius?: number;
}) {
  const pos =
    objectPosition ??
    (focus === 'upper' ? '50% 28%' : focus === 'athlete' ? '50% 35%' : '50% 40%');

  return (
    <View style={[styles.wrap, { minHeight, borderRadius }, style]}>
      <Image
        source={source}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={[
          styles.image,
          Platform.OS === 'web'
            ? ({ objectPosition: pos, objectFit: 'cover' } as object)
            : null,
        ]}
      />
      <View style={[styles.scrim, { backgroundColor: scrim }]} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
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
