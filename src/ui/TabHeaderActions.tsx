import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../store/AppContext';
import { useThemeColors } from '../theme/ThemeContext';
import { IconBell, IconSearch, IconSettings } from './icons/AppIcons';

type Props = {
  /** Sur l’onglet Vous : accès paramètres (comme Instagram / Strava) */
  showSettings?: boolean;
};

/** En-tête : recherche · notifications · (paramètres sur Vous) */
export function TabHeaderActions({ showSettings = false }: Props) {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const router = useRouter();
  const p = state.profile;

  const unread = (p.socialNotifications ?? []).filter((n) => {
    if (n.kind === 'follow_request') return n.requestStatus === 'pending';
    return !n.read;
  }).length;

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        onPress={() => router.push('/search')}
        accessibilityLabel="Rechercher des athlètes"
      >
        <IconSearch size={24} color={colors.text} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        onPress={() => router.push('/notifications')}
        accessibilityLabel="Notifications"
      >
        <IconBell size={23} color={colors.text} />
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      {showSettings ? (
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push('/settings')}
          accessibilityLabel="Paramètres"
        >
          <IconSettings size={23} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.55 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
