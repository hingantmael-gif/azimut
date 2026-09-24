import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { Text } from '../../src/ui/Text';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AppScrollView } from '../../src/ui/scrolling';
import { PressableScale } from '../../src/ui/motion/softMotion';
import { ContactCard } from '../../src/ui/legal/LegalUi';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import {
  LEGAL_DOCS,
  LEGAL_DOC_ORDER,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  readingMinutes,
} from '../../src/legal/legalDocs';

const PROMISES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'hand-left', text: 'Tes données ne sont jamais vendues' },
  { icon: 'lock-closed', text: 'Profil privé par défaut' },
  { icon: 'location', text: 'Position utilisée seulement pendant tes séances' },
  { icon: 'download', text: 'Export et suppression en un geste' },
];

/** Centre légal : point d'entrée unique vers CGU, confidentialité, santé, autorisations, mentions. */
export default function LegalHubScreen() {
  const { colors } = useThemeColors();
  const router = useRouter();

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={colors.gradientHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Informations légales</Text>
          <Text style={styles.heroSub}>
            Tout ce qu’il faut savoir sur tes droits, tes données et l’usage de Mova — clair et sans jargon.
          </Text>
          <Text style={styles.heroMeta}>
            Version {LEGAL_VERSION} · mise à jour le {LEGAL_UPDATED}
          </Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.kicker, { color: colors.accent }]}>NOS ENGAGEMENTS</Text>
          {PROMISES.map((p) => (
            <View key={p.text} style={styles.promise}>
              <View style={[styles.promiseIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name={p.icon} size={16} color={colors.accent} />
              </View>
              <Text style={[styles.promiseText, { color: colors.text }]}>{p.text}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>LES DOCUMENTS</Text>
        <View style={{ gap: 10 }}>
          {LEGAL_DOC_ORDER.map((id) => {
            const d = LEGAL_DOCS[id];
            return (
              <PressableScale
                key={id}
                variant="subtle"
                onPress={() => router.push(`/settings/legal/${id}` as Href)}
                accessibilityLabel={d.title}
                style={[styles.docCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              >
                <View style={styles.docInner}>
                  <View style={[styles.docIcon, { backgroundColor: d.color }]}>
                    <Ionicons name={d.icon as keyof typeof Ionicons.glyphMap} size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docTitle, { color: colors.text }]}>{d.title}</Text>
                    <Text style={[styles.docSub, { color: colors.textMuted }]}>
                      {d.subtitle} · {readingMinutes(d)} min
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </PressableScale>
            );
          })}
        </View>

        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>TES DROITS, EN UN CLIC</Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, padding: 0 }]}>
          <RightsRow
            icon="download"
            label="Exporter mes données"
            hint="Compte et sécurité"
            onPress={() => router.push('/settings/account')}
          />
          <RightsRow
            icon="trash"
            label="Supprimer mon compte"
            hint="Compte et sécurité"
            onPress={() => router.push('/settings/account')}
          />
          <RightsRow
            icon="eye-off"
            label="Choisir qui peut me voir"
            hint="Confidentialité du profil"
            onPress={() => router.push('/settings/privacy')}
          />
          <RightsRow
            icon="notifications"
            label="Gérer les notifications"
            hint="Paramètres"
            last
            onPress={() => router.push('/settings/notifications')}
          />
        </View>

        <ContactCard accent={colors.accent} />
      </AppScrollView>
    </SettingsScreen>
  );
}

function RightsRow({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { colors } = useThemeColors();
  return (
    <PressableScale variant="subtle" onPress={onPress} accessibilityLabel={label}>
      <View style={[styles.rightsRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
        <Ionicons name={icon} size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.docTitle, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.docSub, { color: colors.textMuted }]}>{hint}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.md },
  hero: { borderRadius: radii.xl, padding: spacing.lg },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 22, marginTop: 6 },
  heroMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700', marginTop: spacing.md },
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.md },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  promiseIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  promiseText: { flex: 1, fontSize: 15, fontWeight: '600' },
  groupTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.sm },
  docCard: { borderRadius: radii.xl, borderWidth: 1 },
  docInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontSize: 16, fontWeight: '800' },
  docSub: { fontSize: 13, marginTop: 2 },
  rightsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
});
