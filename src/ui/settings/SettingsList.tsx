import { useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { usePathname } from 'expo-router';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { ScreenAtmosphere } from '../atmosphere/ScreenAtmosphere';
import type { ColorPalette } from '../../theme/palettes';
import { PressableScale, ScreenEnter } from '../motion/softMotion';

const webNoOutline =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object)
    : null;

export type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  /** Icône explicite (sinon déduite de l'intitulé). */
  icon?: IconSpec;
};

type IconSpec = { name: keyof typeof Ionicons.glyphMap; color: string };

/**
 * Icône déduite de l'intitulé : chaque ligne gagne une pastille colorée sans qu'il faille
 * modifier les écrans. `icon` explicite (prop) prime sur cette déduction.
 */
const ICON_RULES: [RegExp, IconSpec][] = [
  [/déconnex|supprim|quitter/i, { name: 'log-out', color: '#DC2626' }],
  [/abonnement|premium/i, { name: 'diamond', color: '#B8860B' }],
  [/e-?mail|courriel/i, { name: 'mail', color: '#0891B2' }],
  [/mot de passe|sécurité|2fa|compte/i, { name: 'shield-checkmark', color: '#2563EB' }],
  [/mode sombre|thème|apparence/i, { name: 'moon', color: '#3B82F6' }],
  [/langue/i, { name: 'language', color: '#0EA5E9' }],
  [/unités|carte|distance/i, { name: 'map', color: '#16A34A' }],
  [/notif|rappel|alerte/i, { name: 'notifications', color: '#F59E0B' }],
  [/montre|appareil|sync|garmin|strava|intégration|connect/i, { name: 'watch', color: '#E11D48' }],
  [/confidential|autorisation|qui peut|donnée|privé/i, { name: 'lock-closed', color: '#475569' }],
  [/aide|support|centre|contact/i, { name: 'help-buoy', color: '#0284C7' }],
  [/cgu|conditions|politique|légal|mentions/i, { name: 'document-text', color: '#64748B' }],
  [/objectif|niveau|sportif|forme|perf|entra/i, { name: 'trophy', color: '#0B8262' }],
  [/profil|identité|photo|fond/i, { name: 'person', color: '#0B8262' }],
  [/horaire|planning|jours|agenda/i, { name: 'calendar', color: '#0EA5E9' }],
];

export function iconForLabel(label: string): IconSpec {
  for (const [re, spec] of ICON_RULES) if (re.test(label)) return spec;
  return { name: 'settings', color: '#64748B' };
}

function RowIcon({ label, icon }: { label: string; icon?: IconSpec }) {
  const spec = icon ?? iconForLabel(label);
  return (
    <View style={[iconStyles.box, { backgroundColor: spec.color }]}>
      <Ionicons name={spec.name} size={17} color="#FFFFFF" />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  box: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});

function useSettingsStyles() {
  const { colors } = useThemeColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  const styles = useSettingsStyles();
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  showChevron = true,
  icon,
}: SettingsRowProps) {
  const styles = useSettingsStyles();
  if (!onPress) {
    return (
      <View style={[styles.row, styles.rowInner, webNoOutline]}>
        <RowIcon label={label} icon={icon} />
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        </View>
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      variant="nav"
      style={[styles.row, webNoOutline]}
      accessibilityLabel={label}
    >
      <View style={styles.rowInner}>
        <RowIcon label={label} icon={icon} />
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>{label}</Text>
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
          {showChevron ? <Text style={styles.chevron}>›</Text> : null}
        </View>
      </View>
    </PressableScale>
  );
}

export function SettingsToggleRow({
  label,
  subtitle,
  value,
  onToggle,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
}) {
  const styles = useSettingsStyles();
  return (
    <PressableScale onPress={onToggle} variant="subtle" style={styles.row} accessibilityLabel={label}>
      <View style={styles.rowInner}>
        <RowIcon label={label} />
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.toggle, value && styles.toggleOn]}>
          <View style={[styles.knob, value && styles.knobOn]} />
        </View>
      </View>
    </PressableScale>
  );
}

export function SettingsScreen({ children }: { children: ReactNode }) {
  const styles = useSettingsStyles();
  const pathname = usePathname();
  return (
    <ScreenEnter resetKey={pathname} intensity="sm" style={styles.screen}>
      <ScreenAtmosphere intensity={0.8} />
      {children}
    </ScreenEnter>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    section: { marginTop: spacing.lg },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      letterSpacing: 1.1,
    },
    // Carte groupée arrondie ; la dernière ligne déborde de 1 px pour masquer son séparateur.
    sectionBody: {
      marginHorizontal: spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      boxShadow: `0px 6px 20px ${colors.shadow}12`,
    },
    row: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      minHeight: 54,
      marginBottom: -StyleSheet.hairlineWidth,
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      minHeight: 48,
      width: '100%',
    },
    rowPressed: { backgroundColor: colors.bgSecondary },
    rowLabel: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
    rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue: { fontSize: 15, color: colors.textMuted, maxWidth: 160 },
    chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
    destructive: { color: colors.danger },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.borderStrong,
      padding: 2,
      justifyContent: 'center',
    },
    toggleOn: { backgroundColor: colors.accent, boxShadow: `0px 0px 12px ${colors.accent}55` },
    knob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.white,
    },
    knobOn: { alignSelf: 'flex-end' },
  });
}
