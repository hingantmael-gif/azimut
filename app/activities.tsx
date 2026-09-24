import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text } from '../src/ui/Text';
import { useApp } from '../src/store/AppContext';
import { formatDuration } from '../src/engines/core';
import { resolveActivePrograms } from '../src/engines/multiProgramPlan';
import {
  activitiesInPeriod,
  activitySport,
  availableSports,
  filterActivities,
  groupByMonth,
  programOfActivity,
  sortActivities,
  totalsOf,
  type ActivityPeriod,
  type ActivitySportFilter,
} from '../src/engines/activityFeed';
import { tintForSport } from '../src/theme/sportTints';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppScrollView } from '../src/ui/scrolling';
import { PressableScale } from '../src/ui/motion/softMotion';

type Icon = keyof typeof Ionicons.glyphMap;

const SPORTS: Record<Exclude<ActivitySportFilter, 'all'>, { label: string; icon: Icon; tint: string }> = {
  run: { label: 'Course', icon: 'walk', tint: 'run' },
  bike: { label: 'Vélo', icon: 'bicycle', tint: 'bike' },
  swim: { label: 'Natation', icon: 'water', tint: 'swim' },
  strength: { label: 'Muscu', icon: 'barbell', tint: 'strength' },
  other: { label: 'Autre', icon: 'fitness', tint: 'other' },
};

const PERIODS: { id: ActivityPeriod; label: string }[] = [
  { id: 'week', label: '7 jours' },
  { id: 'month', label: '30 jours' },
  { id: 'all', label: 'Tout' },
];

/** Historique de toutes les activités : enregistrées dans le tracker ou importées. */
export default function ActivitiesScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sport, setSport] = useState<ActivitySportFilter>('all');
  const [period, setPeriod] = useState<ActivityPeriod>('month');

  const sorted = useMemo(() => sortActivities(state.activities), [state.activities]);
  const sports = useMemo(() => availableSports(sorted), [sorted]);
  const programs = useMemo(() => resolveActivePrograms(state.profile), [state.profile]);
  const analysisByActivity = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of state.analyses) m.set(a.activityId, a.compliance.total);
    return m;
  }, [state.analyses]);

  const visible = useMemo(() => filterActivities(sorted, sport), [sorted, sport]);
  const totals = useMemo(() => totalsOf(activitiesInPeriod(visible, period)), [visible, period]);
  const groups = useMemo(() => groupByMonth(visible), [visible]);

  const startRecording = () => router.push({ pathname: '/session/live', params: { mode: 'free', sport: 'run' } });

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 56 }}>
      <LinearGradient
        colors={colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroKicker}>MES ACTIVITÉS</Text>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <PressableScale
              key={p.id}
              variant="subtle"
              onPress={() => setPeriod(p.id)}
              accessibilityLabel={p.label}
              style={[styles.periodChip, period === p.id && styles.periodChipOn]}
            >
              <Text style={[styles.periodText, period === p.id && styles.periodTextOn]}>{p.label}</Text>
            </PressableScale>
          ))}
        </View>
        <View style={styles.heroStats}>
          <HeroStat value={String(totals.sessions)} label="séances" />
          <HeroStat value={totals.km.toFixed(totals.km >= 100 ? 0 : 1).replace('.', ',')} label="km" />
          <HeroStat value={totals.hours.toFixed(1).replace('.', ',')} label="heures" />
        </View>
      </LinearGradient>

      <View style={styles.actions}>
        <PressableScale variant="subtle" onPress={startRecording} accessibilityLabel="Enregistrer une sortie" style={[styles.actionBtn, styles.actionPrimary]}>
          <View style={styles.actionInner}>
            <Ionicons name="radio-button-on" size={18} color={colors.onAccent} />
            <Text style={[styles.actionText, { color: colors.onAccent }]}>Enregistrer</Text>
          </View>
        </PressableScale>
        <PressableScale variant="subtle" onPress={() => router.push('/import-activity')} accessibilityLabel="Importer une activité" style={[styles.actionBtn, styles.actionGhost]}>
          <View style={styles.actionInner}>
            <Ionicons name="cloud-upload" size={18} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Importer</Text>
          </View>
        </PressableScale>
      </View>

      {sports.length > 1 ? (
        <AppScrollView horizontal contentContainerStyle={styles.filters}>
          {(['all', ...sports] as ActivitySportFilter[]).map((s) => {
            const on = sport === s;
            const meta = s === 'all' ? null : SPORTS[s];
            const tint = meta ? tintForSport(meta.tint)[0] : colors.accent;
            return (
              <PressableScale
                key={s}
                variant="subtle"
                onPress={() => setSport(s)}
                accessibilityLabel={meta?.label ?? 'Tout'}
                style={[styles.filter, on && { backgroundColor: tint, borderColor: tint }]}
              >
                <View style={styles.filterInner}>
                  {meta ? <Ionicons name={meta.icon} size={14} color={on ? '#04140D' : colors.textSecondary} /> : null}
                  <Text style={[styles.filterText, on && { color: '#04140D' }]}>{meta?.label ?? 'Tout'}</Text>
                </View>
              </PressableScale>
            );
          })}
        </AppScrollView>
      ) : null}

      {state.activities.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="footsteps" size={34} color={colors.accent} />
          <Text style={styles.emptyTitle}>Aucune activité pour l’instant</Text>
          <Text style={styles.emptySub}>
            Lance le tracker pour enregistrer une sortie : elle apparaîtra ici automatiquement, comptera
            pour ton programme et mettra à jour ta progression.
          </Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune activité dans ce sport</Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.key}>
            <Text style={styles.month}>{g.label.toUpperCase()}</Text>
            {g.items.map((a) => {
              const s = SPORTS[activitySport(a)];
              const tint = tintForSport(s.tint)[0];
              const compliance = analysisByActivity.get(a.id);
              const program = programOfActivity(a.id, programs);
              const dateStr = new Date(a.startDate).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              const paceSec =
                a.avgPaceSecPerKm ?? (a.distanceM > 100 ? a.movingSec / (a.distanceM / 1000) : undefined);
              return (
                <PressableScale
                  key={a.id}
                  variant="subtle"
                  onPress={() => router.push({ pathname: '/activity/[id]', params: { id: a.id } })}
                  accessibilityLabel={a.name}
                  style={styles.card}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.sportBadge, { backgroundColor: tint }]}>
                      <Ionicons name={s.icon} size={20} color="#04140D" />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.cardDate}>{dateStr}</Text>
                      <View style={styles.metrics}>
                        {a.distanceM > 0 ? (
                          <Metric value={`${(a.distanceM / 1000).toFixed(2).replace('.', ',')} km`} />
                        ) : null}
                        <Metric value={formatDuration(a.movingSec)} />
                        {paceSec && activitySport(a) === 'run' ? (
                          <Metric value={`${Math.floor(paceSec / 60)}:${String(Math.round(paceSec % 60)).padStart(2, '0')}/km`} />
                        ) : null}
                      </View>
                      <View style={styles.tags}>
                        {compliance != null ? (
                          <Tag icon="checkmark-circle" text={`${compliance}% du plan`} color={colors.success} />
                        ) : (
                          <Tag icon="sparkles" text="Sortie libre" color={colors.textMuted} />
                        )}
                        {program ? <Tag icon="flag" text={program.title} color={colors.accent} /> : null}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </PressableScale>
              );
            })}
          </View>
        ))
      )}
    </AppScrollView>
  );

  function Metric({ value }: { value: string }) {
    return <Text style={styles.metric}>{value}</Text>;
  }
  function Tag({ icon, text, color }: { icon: Icon; text: string; color: string }) {
    return (
      <View style={[styles.tag, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={[styles.tagText, { color }]} numberOfLines={1}>{text}</Text>
      </View>
    );
  }
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={heroStyles.stat}>
      <Text style={heroStyles.value}>{value}</Text>
      <Text style={heroStyles.label}>{label}</Text>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  stat: { flex: 1 },
  value: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 2 },
});

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    flex1: { flex: 1 },
    hero: { margin: spacing.md, padding: spacing.lg, borderRadius: radii.xl },
    heroKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
    periodRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
    periodChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.22)' },
    periodChipOn: { backgroundColor: '#FFFFFF' },
    periodText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    periodTextOn: { color: '#04140D' },
    heroStats: { flexDirection: 'row', marginTop: spacing.md },
    actions: { flexDirection: 'row', gap: 10, marginHorizontal: spacing.md },
    actionBtn: { flex: 1, borderRadius: radii.lg },
    actionPrimary: { backgroundColor: colors.accent },
    actionGhost: { backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.accent },
    actionInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
    actionText: { fontWeight: '800', fontSize: 15 },
    filters: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 8 },
    filter: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
    },
    filterInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
    filterText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    month: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.1,
      color: colors.textMuted,
    },
    empty: {
      alignItems: 'center',
      gap: 8,
      margin: spacing.md,
      padding: spacing.lg,
      borderRadius: radii.xl,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: { fontWeight: '800', fontSize: 17, color: colors.text, textAlign: 'center' },
    emptySub: { fontSize: 14, color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: colors.bgCard,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
    sportBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
    cardDate: { marginTop: 2, fontSize: 13, color: colors.textMuted },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
    metric: { fontSize: 14, fontWeight: '800', color: colors.text },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, maxWidth: 180 },
    tagText: { fontSize: 12, fontWeight: '700' },
  });
}
