import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import {
  WEEKDAY_DISPLAY_ORDER,
  weekdayLetterLabel,
} from '../../constants/weekDays';
import { radii, spacing } from '../../theme/tokens';
import { SoftPulse, StaggerIn } from '../motion/softMotion';

/** Ordre de remplissage tant que les jours ne sont pas choisis (silhouette) */
const FILL_ORDER = [1, 3, 5, 2, 4, 6, 0] as const;

export type WeekSilhouetteTone = 'hero' | 'surface';

type Props = {
  /** Index d’étape courant (0 = sport) */
  stepIndex: number;
  stepCount: number;
  /** Index de l’étape « jours d’entraînement » */
  daysStepIndex: number;
  /** Jours sélectionnés (0 = dim … 6 = sam) */
  selectedDays?: number[];
  accent?: string;
  tone?: WeekSilhouetteTone;
};

/**
 * Silhouette de semaine — 7 barres L→D qui s’allument au fil du wizard.
 */
export function WeekSilhouettePreview({
  stepIndex,
  stepCount,
  daysStepIndex,
  selectedDays = [],
  accent = BRAND.accent,
  tone = 'hero',
}: Props) {
  const lit = useMemo(() => {
    const flags = Array.from({ length: 7 }, () => false);
    const answered = Math.max(0, stepIndex);
    const progressLit = Math.min(
      7,
      Math.max(1, Math.round((answered / Math.max(1, stepCount - 1)) * 7)),
    );

    if (selectedDays.length > 0 && stepIndex >= daysStepIndex) {
      for (const d of selectedDays) {
        if (d >= 0 && d < 7) flags[d] = true;
      }
      return flags;
    }

    for (let i = 0; i < progressLit; i += 1) {
      flags[FILL_ORDER[i]!] = true;
    }
    return flags;
  }, [stepIndex, stepCount, daysStepIndex, selectedDays]);

  const t =
    tone === 'surface'
      ? {
          track: 'rgba(15, 23, 42, 0.08)',
          label: '#64748B',
          labelOn: '#0F172A',
          barOff: 'rgba(15, 23, 42, 0.12)',
        }
      : {
          track: 'rgba(7, 17, 31, 0.9)',
          label: 'rgba(255,255,255,0.65)',
          labelOn: '#fff',
          barOff: 'rgba(255,255,255,0.28)',
        };

  return (
    <View
      style={[styles.wrap, { backgroundColor: t.track }]}
      accessibilityLabel="Aperçu de la semaine en construction"
    >
      <Text style={[styles.caption, { color: t.label }]}>Ta semaine</Text>
      <View style={styles.row}>
        {WEEKDAY_DISPLAY_ORDER.map((dow, displayIndex) => {
          const on = lit[dow] === true;
          const label = weekdayLetterLabel(dow);
          return (
            <StaggerIn
              key={`sil-${dow}-${on ? 'on' : 'off'}`}
              index={displayIndex}
              step={40}
              duration={480}
            >
              <View style={styles.cell}>
                <SoftPulse intensity={on ? 0.04 : 0}>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: on ? accent : t.barOff,
                        opacity: on ? 1 : 0.55,
                        height: on ? 28 : 14,
                      },
                    ]}
                  />
                </SoftPulse>
                <Text style={[styles.day, { color: on ? t.labelOn : t.label }]}>
                  {label}
                </Text>
              </View>
            </StaggerIn>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  caption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    width: '70%',
    maxWidth: 28,
    minWidth: 10,
    borderRadius: radii.sm,
  },
  day: {
    fontSize: 11,
    fontWeight: '700',
  },
});
