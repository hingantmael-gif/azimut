import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { ColorPalette } from '../../theme/palettes';
import { BODY_IMAGES, type BodyGender } from './bodyAssets';
import { BODY_VIEWBOX, type BodyView } from './bodyViewBox';

type Props = {
  gender: BodyGender;
  onGenderChange: (gender: BodyGender) => void;
};

/** Illustration anatomique — homme/femme, face/dos */
export function MuscleBodyMap({ gender, onGenderChange }: Props) {
  const [view, setView] = useState<BodyView>('front');
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bodyImage = BODY_IMAGES[gender][view];
  const aspect = BODY_VIEWBOX.w / BODY_VIEWBOX.h;

  return (
    <>
      <View style={styles.toggleRow}>
        <View style={styles.toggleGroup}>
          <Pressable
            style={[styles.toggleBtn, gender === 'homme' && styles.toggleBtnActive]}
            onPress={() => onGenderChange('homme')}
          >
            <Text style={[styles.toggleText, gender === 'homme' && styles.toggleTextActive]}>
              Homme
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, gender === 'femme' && styles.toggleBtnActive]}
            onPress={() => onGenderChange('femme')}
          >
            <Text style={[styles.toggleText, gender === 'femme' && styles.toggleTextActive]}>
              Femme
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleGroup}>
          <Pressable
            style={[styles.toggleBtn, view === 'front' && styles.toggleBtnActive]}
            onPress={() => setView('front')}
          >
            <Text style={[styles.toggleText, view === 'front' && styles.toggleTextActive]}>
              Face
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, view === 'back' && styles.toggleBtnActive]}
            onPress={() => setView('back')}
          >
            <Text style={[styles.toggleText, view === 'back' && styles.toggleTextActive]}>
              Dos
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bodyBox, { aspectRatio: aspect }]}>
        <Image
          source={bodyImage}
          style={styles.bodyImage}
          resizeMode="contain"
          accessibilityLabel={`Corps ${gender} ${view}`}
        />
      </View>
    </>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    toggleRow: { marginBottom: spacing.sm },
    toggleGroup: {
      flexDirection: 'row',
      backgroundColor: colors.bgSecondary,
      borderRadius: radii.md,
      padding: 3,
    },
    toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radii.sm },
    toggleBtnActive: { backgroundColor: colors.bg },
    toggleText: { fontWeight: '600', color: colors.textMuted, fontSize: 14 },
    toggleTextActive: { color: colors.accentDark },
    bodyBox: {
      width: '100%',
      maxHeight: 520,
      alignSelf: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    bodyImage: {
      width: '100%',
      height: '100%',
    },
  });
}
