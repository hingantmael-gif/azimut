import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { EditFieldSheet } from '../../src/ui/settings/EditFieldSheet';
import { formatRaceClockInput } from '../../src/utils/dateInput';
import { useApp } from '../../src/store/AppContext';
import {
  formatRaceTime,
  formatVmaKmh,
  parseRaceTime,
  roundVmaKmh,
  summarizeSportsData,
  vmaFromRaceTime,
} from '../../src/engines/athleteProfile';
import { predictRaceTimesSecMap } from '../../src/engines/core';
import {
  estimateFtpFromProfile,
  predictBikeTimesSecMap,
} from '../../src/engines/bikePrediction';
import { predictSwimTimesSecMap } from '../../src/engines/swimPrediction';
import { resolveAthletePaceZones } from '../../src/engines/workoutPresentation';
import { describePaceZoneSource } from '../../src/engines/paceZones';
import {
  BIKE_DISTANCES,
  RUN_DISTANCES,
  SWIM_DISTANCES,
  TRI_SPLIT_ROWS,
} from '../../src/constants/sportDistances';
import { Body, Muted, PrimaryButton } from '../../src/ui/primitives';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import type { OnboardingAnswers } from '../../src/types/domain';
import { SportAtmosphereBanner } from '../../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../../src/constants/sportVisuals';

type RunKey = keyof NonNullable<OnboardingAnswers['raceTimesSec']>;
type DisciplineId = 'run' | 'swim' | 'bike' | 'triathlon';

/**
 * Hub disciplines → détail chronos.
 * Les valeurs renseignées personnalisent allures / FTP / nage des séances.
 */
export default function SportsDataSettingsScreen() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(
    () =>
      makeStyles(
        colors.textMuted,
        colors.accent,
      ),
    [colors],
  );
  const o = state.profile.onboarding;
  const paceZones = resolveAthletePaceZones(o, state.activities);
  const fill = useMemo(() => summarizeSportsData(o), [o]);

  const [discipline, setDiscipline] = useState<DisciplineId | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);

  const raceTimes = o?.raceTimesSec ?? {};
  const swimTimes = o?.sportTimesSec?.swim ?? {};
  const bikeTimes = o?.sportTimesSec?.bike ?? {};
  const triTimes = o?.sportTimesSec?.triathlon ?? {};
  const displayVma = o?.vmaKmh && o.vmaKmh > 0 ? o.vmaKmh : paceZones?.vmaKmh;
  const displayVmaRounded =
    displayVma != null && displayVma > 0 ? roundVmaKmh(displayVma) : null;

  const patchSportTimes = (
    disc: 'swim' | 'bike' | 'triathlon',
    key: string,
    sec: number,
  ) => {
    const prev = o?.sportTimesSec ?? {};
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        sportTimesSec: {
          ...prev,
          [disc]: {
            ...(prev[disc] ?? {}),
            [key]: sec,
          },
        },
      },
    });
  };

  const saveRun = (key: RunKey, raw: string) => {
    const sec = parseRaceTime(raw);
    if (sec == null || sec <= 0) {
      throw new Error('Format invalide. Ex. 22:30 ou 1:45:00');
    }
    const next: NonNullable<OnboardingAnswers['raceTimesSec']> = {
      ...(o?.raceTimesSec ?? {}),
      [key]: sec,
    };
    const patch: Partial<OnboardingAnswers> = { raceTimesSec: next };
    if (key === '5k') {
      patch.recentTimeSec = sec;
      patch.recentDistanceKm = 5;
      if (!o?.vmaKmh) patch.vmaKmh = roundVmaKmh(vmaFromRaceTime(5, sec));
    }
    dispatch({ type: 'UPDATE_ONBOARDING', patch });
  };

  const saveGeneric = (raw: string): number => {
    const sec = parseRaceTime(raw);
    if (sec == null || sec <= 0) {
      throw new Error('Format invalide. Ex. 1:25 ou 25:30 ou 1:05:00');
    }
    return sec;
  };

  const recomputeFrom5k = () => {
    const five = raceTimes['5k'] ?? o?.recentTimeSec;
    if (!five) return;
    const predicted = predictRaceTimesSecMap(5, five, {
      weeklyKmAvg: o?.weeklyKmAvg,
    });
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        recentTimeSec: five,
        recentDistanceKm: 5,
        raceTimesSec: predicted,
        vmaKmh:
          o?.vmaKmh && o.vmaKmh > 0
            ? roundVmaKmh(o.vmaKmh)
            : roundVmaKmh(vmaFromRaceTime(5, five)),
      },
    });
  };

  const hasSwimRef = Object.values(swimTimes).some((v) => v != null && v > 0);
  const hasBikeChrono = Object.values(bikeTimes).some((v) => v != null && v > 0);
  const hasBikeRef =
    hasBikeChrono || (o?.ftpWatts != null && o.ftpWatts > 80);

  const recomputeSwim = () => {
    if (!hasSwimRef) return;
    const predicted = predictSwimTimesSecMap(swimTimes);
    const prev = o?.sportTimesSec ?? {};
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        sportTimesSec: {
          ...prev,
          swim: predicted,
        },
      },
    });
  };

  const recomputeBike = () => {
    if (!hasBikeRef) return;
    const predicted = predictBikeTimesSecMap(bikeTimes, {
      ftpWatts: o?.ftpWatts,
      weightKg: state.profile.weightKg,
    });
    const prev = o?.sportTimesSec ?? {};
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        sportTimesSec: {
          ...prev,
          bike: predicted,
        },
      },
    });
  };

  /** Simulation vélo : FTP profil (si absent) + remplit les chronos manquants. */
  const simulateBikeProfile = () => {
    const ftp =
      o?.ftpWatts && o.ftpWatts > 80
        ? o.ftpWatts
        : estimateFtpFromProfile({
            level: o?.level,
            weeklyKmAvg: o?.weeklyKmAvg,
            weightKg: state.profile.weightKg,
          });
    const predicted = predictBikeTimesSecMap(bikeTimes, {
      ftpWatts: ftp,
      weightKg: state.profile.weightKg,
    });
    const prev = o?.sportTimesSec ?? {};
    dispatch({
      type: 'UPDATE_ONBOARDING',
      patch: {
        ftpWatts: ftp,
        sportTimesSec: {
          ...prev,
          bike: predicted,
        },
      },
    });
  };

  const editMeta = useMemo(() => {
    if (!editKey) return null;
    if (editKey === 'vma') {
      return {
        title: 'VMA',
        label: 'Vitesse maximale aérobie (km/h) — une décimale suffit (ex. 15,2)',
        value: displayVmaRounded != null ? String(displayVmaRounded).replace('.', ',') : '',
        placeholder: 'Ex. 15,5',
        keyboardType: 'decimal-pad' as const,
      };
    }
    if (editKey === 'ftp') {
      return {
        title: 'FTP',
        label: 'Functional Threshold Power (watts)',
        value: o?.ftpWatts ? String(o.ftpWatts) : '',
        placeholder: 'Ex. 220',
        keyboardType: 'numeric' as const,
      };
    }
    if (editKey.startsWith('run:')) {
      const key = editKey.slice(4) as RunKey;
      const row = RUN_DISTANCES.find((d) => d.key === key);
      return {
        title: row?.label ?? key,
        label: 'Chrono — tape les chiffres (ex. 2230 → 22:30)',
        value: raceTimes[key] != null ? formatRaceTime(raceTimes[key]!) : '',
        placeholder: 'Ex. 2230',
        keyboardType: 'numeric' as const,
        sanitize: formatRaceClockInput,
      };
    }
    if (editKey.startsWith('swim:')) {
      const key = editKey.slice(5);
      const row = SWIM_DISTANCES.find((d) => d.key === key);
      return {
        title: row?.label ?? key,
        label: 'Chrono — tape les chiffres (ex. 0125 → 01:25)',
        value: swimTimes[key] != null ? formatRaceTime(swimTimes[key]!) : '',
        placeholder: 'Ex. 0125',
        keyboardType: 'numeric' as const,
        sanitize: formatRaceClockInput,
      };
    }
    if (editKey.startsWith('bike:')) {
      const key = editKey.slice(5);
      const row = BIKE_DISTANCES.find((d) => d.key === key);
      return {
        title: row?.label ?? key,
        label: 'Chrono — tape les chiffres (ex. 13000 → 1:30:00)',
        value: bikeTimes[key] != null ? formatRaceTime(bikeTimes[key]!) : '',
        placeholder: 'Ex. 13000',
        keyboardType: 'numeric' as const,
        sanitize: formatRaceClockInput,
      };
    }
    if (editKey.startsWith('tri:')) {
      const key = editKey.slice(4);
      const row = TRI_SPLIT_ROWS.find((d) => d.key === key);
      return {
        title: row?.label ?? key,
        label: 'Chrono split — chiffres (ex. 2800 → 28:00)',
        value: triTimes[key] != null ? formatRaceTime(triTimes[key]!) : '',
        placeholder: 'Ex. 2800',
        keyboardType: 'numeric' as const,
        sanitize: formatRaceClockInput,
      };
    }
    return null;
  }, [editKey, displayVmaRounded, o?.ftpWatts, raceTimes, swimTimes, bikeTimes, triTimes]);

  const onSaveEdit = (v: string) => {
    if (!editKey) return;
    if (editKey === 'vma') {
      const n = Number(v.replace(',', '.'));
      if (!Number.isFinite(n) || n < 8 || n > 28) {
        throw new Error('Indiquez une VMA entre 8 et 28 km/h.');
      }
      dispatch({
        type: 'UPDATE_ONBOARDING',
        patch: { vmaKmh: roundVmaKmh(n) },
      });
      return;
    }
    if (editKey === 'ftp') {
      const n = Number(v.replace(/\s/g, ''));
      if (!Number.isFinite(n) || n < 80 || n > 500) {
        throw new Error('FTP entre 80 et 500 W.');
      }
      dispatch({ type: 'UPDATE_ONBOARDING', patch: { ftpWatts: Math.round(n) } });
      return;
    }
    const sec = saveGeneric(v);
    if (editKey.startsWith('run:')) {
      saveRun(editKey.slice(4) as RunKey, v);
      return;
    }
    if (editKey.startsWith('swim:')) {
      patchSportTimes('swim', editKey.slice(5), sec);
      return;
    }
    if (editKey.startsWith('bike:')) {
      patchSportTimes('bike', editKey.slice(5), sec);
      return;
    }
    if (editKey.startsWith('tri:')) {
      patchSportTimes('triathlon', editKey.slice(4), sec);
    }
  };

  const statusLabel = (filled: number, total: number, extra?: string) => {
    if (filled <= 0 && !extra) return 'Aucune donnée';
    if (extra && filled <= 0) return extra;
    if (extra) return `${filled}/${total} · ${extra}`;
    return `${filled}/${total} renseigné${filled > 1 ? 's' : ''}`;
  };

  if (discipline == null) {
    return (
      <SettingsScreen>
        <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.intro}>
            <Body style={{ color: colors.text }}>Données sportives</Body>
            <Muted style={{ marginTop: 6, lineHeight: 20 }}>
              Choisis une discipline pour renseigner chronos, VMA ou FTP. Une
              valeur suffit pour caler les allures ; tu peux aussi simuler le
              reste.
            </Muted>
            <View style={{ marginTop: spacing.md }}>
              <SportAtmosphereBanner
                source={ATMOSPHERE_IMAGES.run}
                title="Tes chronos, ton moteur"
                subtitle="Course · natation · vélo — athlètes femmes & hommes au même niveau"
                height={132}
              />
            </View>
            {fill.disciplinesWithData > 0 ? (
              <Text style={styles.summary}>
                {fill.disciplinesWithData} discipline
                {fill.disciplinesWithData > 1 ? 's' : ''} avec données — séances adaptées
              </Text>
            ) : (
              <Text style={styles.summaryMuted}>
                Aucune donnée encore — utilise une simulation ou saisis un chrono
              </Text>
            )}
          </View>

          <SettingsSection title="Disciplines">
            <SettingsRow
              label="Athlétisme (course)"
              value={statusLabel(
                fill.runFilled,
                fill.runTotal,
                fill.hasVma && o?.vmaKmh
                  ? `VMA ${formatVmaKmh(o.vmaKmh)}`
                  : undefined,
              )}
              onPress={() => setDiscipline('run')}
            />
            <SettingsRow
              label="Natation"
              value={statusLabel(fill.swimFilled, fill.swimTotal)}
              onPress={() => setDiscipline('swim')}
            />
            <SettingsRow
              label="Vélo"
              value={statusLabel(
                fill.bikeFilled,
                fill.bikeTotal,
                fill.hasFtp ? `FTP ${o?.ftpWatts} W` : undefined,
              )}
              onPress={() => setDiscipline('bike')}
            />
            <SettingsRow
              label="Triathlon"
              value={statusLabel(fill.triFilled, fill.triTotal)}
              onPress={() => setDiscipline('triathlon')}
            />
          </SettingsSection>
        </AppScrollView>
      </SettingsScreen>
    );
  }

  const titles: Record<DisciplineId, string> = {
    run: 'Athlétisme',
    swim: 'Natation',
    bike: 'Vélo',
    triathlon: 'Triathlon',
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Pressable style={styles.backRow} onPress={() => setDiscipline(null)}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Toutes les disciplines</Text>
        </Pressable>

        <View style={styles.intro}>
          <Body style={{ color: colors.text }}>{titles[discipline]}</Body>
          <Muted style={{ marginTop: 6, lineHeight: 20 }}>
            {discipline === 'run'
              ? 'Chronos course et VMA. Utilisés pour les allures des sorties et intervalles.'
              : discipline === 'swim'
                ? 'Chronos bassin / eau libre. Utilisés pour les cibles de nage.'
                : discipline === 'bike'
                  ? 'FTP et chronos vélo. Utilisés pour les cibles de puissance / durée.'
                  : 'Splits optionnels. Sinon natation + vélo + course servent de base.'}
          </Muted>
        </View>

        {discipline === 'run' ? (
          <>
            <SettingsSection title="Capacité">
              <SettingsRow
                label="VMA"
                value={
                  displayVmaRounded != null
                    ? `${formatVmaKmh(displayVmaRounded)} km/h`
                    : 'À renseigner'
                }
                onPress={() => setEditKey('vma')}
              />
              {paceZones && !o?.vmaKmh ? (
                <Text style={styles.hint}>
                  Estimée ({describePaceZoneSource(paceZones.source)}) — tu peux
                  la corriger ici.
                </Text>
              ) : o?.vmaKmh ? (
                <Text style={styles.hint}>Personnalise les zones d’allure course.</Text>
              ) : null}
            </SettingsSection>
            <SettingsSection title="Chronos route">
              {RUN_DISTANCES.map((row) => (
                <SettingsRow
                  key={row.key}
                  label={row.label}
                  value={
                    raceTimes[row.key as RunKey] != null
                      ? formatRaceTime(raceTimes[row.key as RunKey]!)
                      : 'À renseigner'
                  }
                  onPress={() => setEditKey(`run:${row.key}`)}
                />
              ))}
              {raceTimes['5k'] || o?.recentTimeSec ? (
                <View style={styles.recomputeWrap}>
                  <PrimaryButton
                    label="Simuler les autres distances (depuis le 5 km)"
                    onPress={recomputeFrom5k}
                  />
                  <Muted style={{ marginTop: 8, fontSize: 12 }}>
                    Remplit les chronos course manquants.
                  </Muted>
                </View>
              ) : null}
            </SettingsSection>
          </>
        ) : null}

        {discipline === 'swim' ? (
          <SettingsSection title="Chronos natation">
            {SWIM_DISTANCES.map((row) => (
              <SettingsRow
                key={row.key}
                label={row.label}
                value={
                  swimTimes[row.key] != null
                    ? formatRaceTime(swimTimes[row.key]!)
                    : 'À renseigner'
                }
                onPress={() => setEditKey(`swim:${row.key}`)}
              />
            ))}
            <Text style={styles.hint}>
              Idéal : 200 m + 400 m (Critical Swim Speed). Un seul chrono suffit aussi.
            </Text>
            {hasSwimRef ? (
              <View style={styles.recomputeWrap}>
                <PrimaryButton
                  label="Simuler les autres distances (CSS)"
                  onPress={recomputeSwim}
                />
                <Muted style={{ marginTop: 8, fontSize: 12 }}>
                  Modèle natation : seuil CSS + facteurs par distance.
                </Muted>
              </View>
            ) : null}
          </SettingsSection>
        ) : null}

        {discipline === 'bike' ? (
          <>
            <SettingsSection title="Capacité vélo">
              <SettingsRow
                label="FTP"
                value={o?.ftpWatts ? `${o.ftpWatts} W` : 'À renseigner'}
                onPress={() => setEditKey('ftp')}
              />
            </SettingsSection>
            <SettingsSection title="Chronos vélo">
              {BIKE_DISTANCES.map((row) => (
                <SettingsRow
                  key={row.key}
                  label={row.label}
                  value={
                    bikeTimes[row.key] != null
                      ? formatRaceTime(bikeTimes[row.key]!)
                      : 'À renseigner'
                  }
                  onPress={() => setEditKey(`bike:${row.key}`)}
                />
              ))}
              <View style={styles.recomputeWrap}>
                <PrimaryButton
                  label={
                    hasBikeRef
                      ? 'Simuler les autres distances (FTP / physique)'
                      : 'Simuler mon profil vélo (FTP + chronos)'
                  }
                  onPress={hasBikeRef ? recomputeBike : simulateBikeProfile}
                />
                <Muted style={{ marginTop: 8, fontSize: 12 }}>
                  {hasBikeRef
                    ? 'Complète les distances manquantes via FTP et physique plat.'
                    : 'Sans FTP ni chrono : estime un FTP depuis ton niveau / volume, puis les CLM iconiques.'}
                </Muted>
              </View>
            </SettingsSection>
          </>
        ) : null}

        {discipline === 'triathlon' ? (
          <SettingsSection title="Splits triathlon (optionnel)">
            <Text style={styles.hint}>
              Si vide, la prédiction et le plan utilisent natation / vélo / course.
            </Text>
            {TRI_SPLIT_ROWS.map((row) => (
              <SettingsRow
                key={row.key}
                label={row.label}
                value={
                  triTimes[row.key] != null
                    ? formatRaceTime(triTimes[row.key]!)
                    : 'À renseigner'
                }
                onPress={() => setEditKey(`tri:${row.key}`)}
              />
            ))}
          </SettingsSection>
        ) : null}
      </AppScrollView>

      {editMeta ? (
        <EditFieldSheet
          visible
          title={editMeta.title}
          label={editMeta.label}
          value={editMeta.value}
          placeholder={editMeta.placeholder}
          keyboardType={editMeta.keyboardType}
          sanitize={'sanitize' in editMeta ? editMeta.sanitize : undefined}
          autoCapitalize="none"
          onClose={() => setEditKey(null)}
          onSave={onSaveEdit}
        />
      ) : null}
    </SettingsScreen>
  );
}

function makeStyles(textMuted: string, accent: string) {
  return StyleSheet.create({
    intro: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    summary: {
      marginTop: spacing.sm,
      fontSize: 13,
      fontWeight: '700',
      color: accent,
      lineHeight: 18,
    },
    summaryMuted: {
      marginTop: spacing.sm,
      fontSize: 13,
      color: textMuted,
      lineHeight: 18,
    },
    backRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: 4,
    },
    backText: { fontSize: 15, fontWeight: '700' },
    hint: {
      fontSize: 12,
      color: textMuted,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      lineHeight: 17,
    },
    recomputeWrap: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
  });
}
