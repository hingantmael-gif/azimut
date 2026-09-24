import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { radii, spacing } from '../../theme/tokens';
import type { PlannedWorkout } from '../../types/domain';
import { computeWeekLoads, type WeekLoad } from '../../engines/weekLoads';
import { Text } from '../Text';

const BAR_MAX = 54;

/**
 * Aperçu de la charge du programme, semaine par semaine : ce que l'utilisateur
 * s'apprête à valider (montée progressive, décharges, pic, affûtage).
 */
export function LoadCurvePreview({ plan }: { plan: PlannedWorkout[] | null }) {
  const weeks = useMemo(() => (plan ? computeWeekLoads(plan) : []), [plan]);
  const grow = useRef(new Animated.Value(0)).current;
  const signature = weeks.map((w) => w.minutes).join(',');

  useEffect(() => {
    grow.setValue(0);
    Animated.timing(grow, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [signature, grow]);

  if (weeks.length < 2) return null;
  const max = Math.max(...weeks.map((w) => w.minutes), 1);
  const total = weeks.reduce((s, w) => s + w.minutes, 0);
  const sessions = weeks.reduce((s, w) => s + w.sessions, 0);
  const hours = total / 60;
  // La carte est toujours sombre (voile sur photo) : palette claire fixe, lisible en clair comme en sombre.
  const colorFor = (k: WeekLoad['kind']) =>
    k === 'peak' ? '#3DFF9A' : k === 'deload' ? '#38BDF8' : k === 'taper' ? '#FFC53D' : 'rgba(95,217,176,0.62)';

  return (
    <View
      style={[styles.wrap, { backgroundColor: 'rgba(6,13,24,0.5)', borderColor: 'rgba(255,255,255,0.14)' }]}
      accessibilityLabel={`Charge du programme sur ${weeks.length} semaines, environ ${Math.round(hours)} heures`}
    >
      <View style={styles.head}>
        <Text style={styles.title}>Ta charge, semaine par semaine</Text>
        <Text style={styles.meta}>
          {sessions} séances · ~{Math.round(hours)} h
        </Text>
      </View>
      <View style={styles.bars}>
        {weeks.map((w) => {
          const h = Math.max(6, (w.minutes / max) * BAR_MAX);
          return (
            <View key={w.index} style={styles.col}>
              <Animated.View
                style={{
                  width: '100%',
                  height: grow.interpolate({ inputRange: [0, 1], outputRange: [4, h] }),
                  borderRadius: 5,
                  backgroundColor: colorFor(w.kind),
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Legend color="rgba(95,217,176,0.62)" label="Montée" />
        <Legend color="#3DFF9A" label="Pic" />
        <Legend color="#38BDF8" label="Décharge" />
        <Legend color="#FFC53D" label="Affûtage" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  meta: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX,
    gap: 4,
    marginTop: spacing.sm,
  },
  col: { flex: 1, height: BAR_MAX, justifyContent: 'flex-end' },
  legend: { flexDirection: 'row', gap: 12, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
});
