import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../store/AppContext';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorPalette } from '../theme/palettes';
import { ProfileAvatar } from './profile/ProfileAvatar';

/** Avatar en-tête — thème sombre */
export function ProfileHeaderButton() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const p = state.profile;
  const initials = `${p.firstName?.[0] || '?'}${p.lastName?.[0] || ''}`;

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => router.push('/(tabs)/profile')}
      accessibilityLabel="Mon profil"
    >
      <ProfileAvatar
        uri={p.avatarUri}
        initials={initials}
        size={34}
        borderColor={colors.accent}
      />
    </Pressable>
  );
}

function makeStyles(_colors: ColorPalette) {
  return StyleSheet.create({
    wrap: { marginRight: 12 },
  });
}
