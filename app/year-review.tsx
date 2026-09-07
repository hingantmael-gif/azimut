import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../src/store/AppContext';
import { buildYearSummary } from '../src/engines/muscleRecovery';
import { DEMO_DIRECTORY as DEMO_MEMBERS } from '../src/data/demoDirectory';
import { colors, radii, spacing } from '../src/theme/tokens';
import { AppScrollView } from '../src/ui/scrolling';
import { formatCompactNumber } from '../src/utils/formatCompactNumber';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** Bilan annuel — récap & classement amis (démo) */
export default function YearReviewScreen() {
  const { state } = useApp();
  const p = state.profile;
  const summary = buildYearSummary({
    activities: state.activities,
    lifetime: state.lifetime,
    profileName: `${p.firstName} ${p.lastName}`.trim(),
  });

  const leaderboard = [
    { name: `${p.firstName} ${p.lastName}`.trim() || 'Vous', km: summary.totalKm, you: true },
    ...DEMO_MEMBERS.map((m) => ({ name: m.name, km: m.km, you: false })),
  ].sort((a, b) => b.km - a.km);

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
      <SportAtmosphereBanner
        source={ATMOSPHERE_IMAGES.triathlon}
        title={`Saison ${summary.year}`}
        subtitle="Tes kilomètres, tes progrès — récap annuel"
        height={150}
      />
      <Text style={styles.hero}>{summary.year}</Text>
      <Text style={styles.title}>Votre saison</Text>
      <Text style={styles.sub}>{summary.highlight}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statN}>
            {formatCompactNumber(summary.totalSessions, { empty: '0' })}
          </Text>
          <Text style={styles.statL}>Séances</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statN}>
            {formatCompactNumber(summary.totalKm, { empty: '0' })}
          </Text>
          <Text style={styles.statL}>Kilomètres</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statN}>
            {formatCompactNumber(Math.round(state.lifetime.totalHours), { empty: '0' })}
          </Text>
          <Text style={styles.statL}>Heures</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statN}>
            {formatCompactNumber(p.ranked.xp, { empty: '0' })}
          </Text>
          <Text style={styles.statL}>XP gagnés</Text>
        </View>
      </View>

      <Text style={styles.section}>Meilleur mois</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{summary.bestMonth.label}</Text>
        <Text style={styles.cardMeta}>{summary.bestMonth.count} séances enregistrées</Text>
      </View>

      <Text style={styles.section}>Classement du cercle (km {summary.year})</Text>
      {leaderboard.map((row, i) => (
        <View key={row.name} style={[styles.rankRow, row.you && styles.rankRowYou]}>
          <Text style={styles.rankPos}>#{i + 1}</Text>
          <Text style={styles.rankName}>{row.name}{row.you ? ' (vous)' : ''}</Text>
          <Text style={styles.rankKm}>{formatCompactNumber(row.km, { empty: '0' })} km</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Badges débloqués</Text>
        {p.achievements.filter((a) => a.unlockedAt).length === 0 ? (
          <Text style={styles.cardMeta}>Continuez — vos badges apparaîtront ici.</Text>
        ) : (
          p.achievements
            .filter((a) => a.unlockedAt)
            .map((a) => (
              <Text key={a.id} style={styles.badge}>
                ✓ {a.title}
              </Text>
            ))
        )}
      </View>
    </AppScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSecondary },
  hero: { fontSize: 48, fontWeight: '900', color: colors.accent, lineHeight: 52 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSecondary, marginTop: 4, lineHeight: 22, marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statBox: {
    width: '47%',
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statN: { fontSize: 26, fontWeight: '900', color: colors.text },
  statL: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  section: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontWeight: '800', color: colors.text, fontSize: 16 },
  cardMeta: { color: colors.textMuted, marginTop: 4 },
  badge: { color: colors.textSecondary, marginTop: 6 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankRowYou: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  rankPos: { width: 36, fontWeight: '800', color: colors.textMuted },
  rankName: { flex: 1, fontWeight: '600', color: colors.text },
  rankKm: { fontWeight: '700', color: colors.accent },
});
