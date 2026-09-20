import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';

const KEY = 'mova-install-banner-dismissed-at';
const SNOOZE_MS = 7 * 24 * 3600_000;

/**
 * Invite à installer Mova sur l'écran d'accueil — pour TOUS les comptes, tant que l'app est ouverte dans un
 * navigateur (jamais une fois installée). Masquable : réapparaît après 7 jours.
 */
export function InstallBanner() {
  const { colors } = useThemeColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      const at = Number(window.localStorage.getItem(KEY) ?? 0);
      if (at && Date.now() - at < SNOOZE_MS) return;
    } catch {
      /* stockage indisponible : on affiche */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="download" size={20} color={colors.accent} />
      </View>
      <Pressable
        style={{ flex: 1 }}
        accessibilityRole="button"
        accessibilityLabel="Installer Mova sur l’écran d’accueil"
        onPress={() => window.location.assign('/telecharger.html')}
      >
        <Text style={[styles.title, { color: colors.text }]}>Installer Mova</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Sur ton écran d’accueil, comme une vraie appli — plus rapide, plein écran.</Text>
      </Pressable>
      <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Masquer">
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});
