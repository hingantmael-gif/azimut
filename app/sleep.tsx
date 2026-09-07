import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../src/store/AppContext';
import { WatchBrandPicker } from '../src/ui/sleep/WatchBrandPicker';
import { SleepCalendar } from '../src/ui/sleep/SleepCalendar';
import { getWatchEntry, watchExtractLabel } from '../src/constants/watches';
import {
  buildManualSleepNight,
  clampSleepScore,
  normalizeSleepScore,
  sleepBrandCompareHint,
  sleepScoreLabel,
} from '../src/engines/sleepAdaptation';
import {
  isSleepDateAllowed,
  nightForDate,
  toLocalDateIso,
} from '../src/engines/sleepCalendar';
import type { WatchBrandId } from '../src/types/domain';
import { formatMinutes } from '../src/engines/core';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { AppScrollView } from '../src/ui/scrolling';
import { FadeInUp } from '../src/ui/motion/softMotion';
import { AppTextInput } from '../src/ui/AppTextInput';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** Écran Sommeil — calendrier interactif + saisie / correction (depuis l’inscription) */
export default function SleepScreen() {
  const { state, dispatch } = useApp();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [importing, setImporting] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(toLocalDateIso());
  const [scoreDraft, setScoreDraft] = useState('');
  const [hoursDraft, setHoursDraft] = useState('');
  const [minsDraft, setMinsDraft] = useState('');

  const watch = state.profile.watch;
  const needsSetup = !watch?.brandId;
  const sleep = state.health.sleep;
  const history = state.health.sleepHistory;
  const accountCreatedAt = state.profile.createdAt;
  const selectedNight = selectedDate ? nightForDate(history, selectedDate) : undefined;

  const onSelectWatch = useCallback(
    (brandId: WatchBrandId) => {
      dispatch({ type: 'SET_WATCH', brandId });
    },
    [dispatch],
  );

  const resetDrafts = useCallback(() => {
    setScoreDraft('');
    setHoursDraft('');
    setMinsDraft('');
    setImporting(false);
    setEditingDate(null);
  }, []);

  const fillDraftFromNight = useCallback(
    (dateIso: string) => {
      const night = nightForDate(history, dateIso);
      setEditingDate(dateIso);
      setSelectedDate(dateIso);
      if (night) {
        setScoreDraft(String(night.score));
        const total = night.totalMinutes ?? 0;
        const h = Math.floor(total / 60);
        const m = total % 60;
        setHoursDraft(total > 0 ? String(h) : '');
        setMinsDraft(total > 0 ? String(m) : '');
      } else {
        setScoreDraft('');
        setHoursDraft('');
        setMinsDraft('');
      }
      setImporting(true);
    },
    [history],
  );

  const openForDate = useCallback(
    (dateIso: string) => {
      if (
        !isSleepDateAllowed(dateIso, {
          accountCreatedAt,
          todayIso: toLocalDateIso(),
        })
      ) {
        Alert.alert(
          'Date non autorisée',
          'Tu ne peux saisir le sommeil qu’entre ton inscription et aujourd’hui.',
        );
        return;
      }
      fillDraftFromNight(dateIso);
    },
    [accountCreatedAt, fillDraftFromNight],
  );

  const openTodayOrLast = useCallback(() => {
    const target = sleep?.date ?? toLocalDateIso();
    openForDate(target);
  }, [openForDate, sleep?.date]);

  const onSelectCalendarDate = useCallback((iso: string) => {
    setSelectedDate(iso);
  }, []);

  const onClearDate = useCallback(
    (dateIso: string) => {
      const night = nightForDate(history, dateIso);
      if (!night) return;
      Alert.alert(
        'Effacer cette nuit ?',
        `Score ${night.score}/100 du ${new Date(dateIso + 'T12:00:00').toLocaleDateString('fr-FR')} sera supprimé.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Effacer',
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'CLEAR_SLEEP', date: dateIso });
              resetDrafts();
            },
          },
        ],
      );
    },
    [dispatch, history, resetDrafts],
  );

  const onSave = useCallback(() => {
    const scoreRaw = String(scoreDraft).replace(',', '.').trim();
    if (!scoreRaw) {
      Alert.alert('Score manquant', 'Entre ton score sommeil (exemple : 72).');
      return;
    }
    const parsed = Number(scoreRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100 || !Number.isInteger(parsed)) {
      Alert.alert(
        'Score invalide',
        'Entre un nombre entier entre 0 et 100 (exemple : 72).',
      );
      return;
    }

    const hoursRaw = String(hoursDraft).trim();
    const minsRaw = String(minsDraft).trim();
    if (!hoursRaw && !minsRaw) {
      Alert.alert('Durée manquante', 'Indique combien de temps tu as dormi (exemple : 7 h 30 min).');
      return;
    }

    if (minsRaw !== '') {
      if (!/^\d{1,2}$/.test(minsRaw)) {
        Alert.alert(
          'Minutes invalides',
          'Entre un nombre de minutes entre 0 et 59 (exemple : 30).',
        );
        return;
      }
      const mCheck = Number(minsRaw);
      if (mCheck > 59) {
        Alert.alert(
          'Minutes invalides',
          'Les minutes doivent être entre 0 et 59. Exemple : 7 h 30 min (pas 5 h 87).',
        );
        return;
      }
    }

    if (hoursRaw !== '' && !/^\d{1,2}$/.test(hoursRaw)) {
      Alert.alert('Heures invalides', 'Entre un nombre d’heures entre 0 et 24 (exemple : 7).');
      return;
    }

    const h = hoursRaw === '' ? 0 : Number(hoursRaw);
    const m = minsRaw === '' ? 0 : Number(minsRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) {
      Alert.alert('Durée invalide', 'Entre une durée valable (exemple : 7 h 30 min).');
      return;
    }
    if (h === 0 && m === 0) {
      Alert.alert('Durée manquante', 'Indique combien de temps tu as dormi (exemple : 7 h 30 min).');
      return;
    }
    if (h > 24 || h * 60 + m > 24 * 60) {
      Alert.alert('Durée invalide', 'La durée doit rester réaliste (max 24 h).');
      return;
    }

    const dateIso = editingDate ?? toLocalDateIso();
    if (
      !isSleepDateAllowed(dateIso, {
        accountCreatedAt,
        todayIso: toLocalDateIso(),
      })
    ) {
      Alert.alert(
        'Date non autorisée',
        'Tu ne peux pas enregistrer de sommeil avant la création de ton compte, ni pour un jour futur.',
      );
      return;
    }

    const score = clampSleepScore(parsed);
    const totalMinutes = Math.round(h) * 60 + Math.round(m);
    const brand = watch?.brandId;
    const hadNight = Boolean(nightForDate(history, dateIso));
    const night = buildManualSleepNight({
      score,
      totalMinutes,
      source: brand,
      date: dateIso,
    });
    dispatch({ type: 'UPSERT_SLEEP', night });
    setSelectedDate(dateIso);
    resetDrafts();
    const canon = normalizeSleepScore(score, brand);
    const canonNote =
      brand === 'apple' && canon !== score
        ? `\nÉquivalent coach : ${canon}/100 (échelle Garmin/Fitbit).`
        : '';
    Alert.alert(
      hadNight ? 'Nuit mise à jour' : 'Nuit enregistrée',
      `${score}/100 · ${sleepScoreLabel(score, brand)} · ${formatMinutes(totalMinutes)}${canonNote}`,
    );
  }, [
    accountCreatedAt,
    dispatch,
    editingDate,
    history,
    hoursDraft,
    minsDraft,
    resetDrafts,
    scoreDraft,
    watch?.brandId,
  ]);

  if (needsSetup) {
    return (
      <AppScrollView style={styles.root} contentContainerStyle={styles.content}>
        <FadeInUp>
          <WatchBrandPicker
            title="Quel type de montre as-tu ?"
            subtitle="On te demandera ensuite le score et la durée affichés sur ta montre."
            selectedId={watch?.brandId}
            onSelect={onSelectWatch}
          />
        </FadeInUp>
      </AppScrollView>
    );
  }

  const entry = getWatchEntry(watch!.brandId);
  const formTitle = editingDate
    ? nightForDate(history, editingDate)
      ? 'Corriger le sommeil'
      : 'Compléter le sommeil'
    : 'Score sommeil';
  const formDateLabel = editingDate
    ? new Date(editingDate + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <AppScrollView style={styles.root} contentContainerStyle={styles.content}>
      <FadeInUp>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.swim}
          title="Nuit récupérée"
          subtitle="Score & durée depuis ta montre — calendrier ci-dessous"
          height={136}
        />
        <Text style={styles.hero}>Sommeil</Text>
        <Text style={styles.heroSub}>
          {entry.label} · {entry.scoreScaleHint}
        </Text>
      </FadeInUp>

      {!importing ? (
        <FadeInUp delay={40}>
          <Pressable style={styles.primaryBtn} onPress={openTodayOrLast}>
            <Text style={styles.primaryBtnText}>
              {sleep ? 'Modifier / compléter une nuit' : watchExtractLabel()}
            </Text>
          </Pressable>
          <Text style={styles.fieldHint}>
            Ou choisis un jour dans le calendrier (y compris la veille si tu as oublié).{' '}
            {sleepBrandCompareHint(watch!.brandId)}
          </Text>
        </FadeInUp>
      ) : (
        <FadeInUp delay={40}>
          <Text style={styles.sectionTitle}>{formTitle}</Text>
          {formDateLabel ? (
            <Text style={[styles.fieldHint, { textTransform: 'capitalize' }]}>
              {formDateLabel}
            </Text>
          ) : null}
          <Text style={styles.fieldHint}>{entry.scoreScaleHint}</Text>
          <AppTextInput
            style={[styles.scoreInput, !scoreDraft && styles.inputExample]}
            value={scoreDraft}
            onChangeText={setScoreDraft}
            keyboardType="number-pad"
            placeholder="ex. 72"
            placeholderTextColor={colors.textMuted}
            maxLength={3}
            accessibilityLabel="Score sommeil sur 100"
          />
          <Text style={[styles.fieldHint, { marginTop: spacing.sm }]}>
            {sleepBrandCompareHint(watch!.brandId)}
          </Text>

          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Durée de sommeil</Text>
          <View style={styles.durationRow}>
            <AppTextInput
              style={[styles.durationInput, !hoursDraft && styles.inputExample]}
              value={hoursDraft}
              onChangeText={setHoursDraft}
              keyboardType="number-pad"
              placeholder="ex. 7"
              placeholderTextColor={colors.textMuted}
              maxLength={2}
              accessibilityLabel="Heures de sommeil"
            />
            <Text style={styles.durationUnit}>h</Text>
            <AppTextInput
              style={[styles.durationInput, !minsDraft && styles.inputExample]}
              value={minsDraft}
              onChangeText={setMinsDraft}
              keyboardType="number-pad"
              placeholder="ex. 30"
              placeholderTextColor={colors.textMuted}
              maxLength={2}
              accessibilityLabel="Minutes de sommeil"
            />
            <Text style={styles.durationUnit}>min</Text>
          </View>
          <Text style={[styles.fieldHint, { marginTop: spacing.sm }]}>
            Exemple : 7 h 30 min — les minutes vont de 0 à 59.
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryBtn} onPress={resetDrafts}>
              <Text style={styles.secondaryBtnText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveBtnText}>Enregistrer</Text>
            </Pressable>
          </View>
        </FadeInUp>
      )}

      {sleep && !importing ? (
        <FadeInUp delay={80}>
          <View style={styles.lastNight}>
            <Text style={styles.lastLabel}>Dernière nuit enregistrée</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreBig, { color: colors.sleep }]}>{sleep.score}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.scoreCaption}>
                  {sleepScoreLabel(sleep.score, sleep.source ?? watch?.brandId)}
                </Text>
                <Text style={styles.scoreMeta}>
                  {new Date(sleep.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                  {sleep.totalMinutes > 0 ? ` · ${formatMinutes(sleep.totalMinutes)}` : ''}
                </Text>
                {sleep.normalizedScore != null &&
                sleep.normalizedScore !== sleep.score &&
                (sleep.source ?? watch?.brandId) === 'apple' ? (
                  <Text style={styles.scoreMeta}>
                    Équivalent coach {sleep.normalizedScore}/100
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </FadeInUp>
      ) : null}

      <FadeInUp delay={120}>
        <Text style={styles.sectionTitle}>Planning du sommeil</Text>
        <SleepCalendar
          history={history}
          accountCreatedAt={accountCreatedAt}
          selectedDate={selectedDate}
          onSelectDate={onSelectCalendarDate}
        />
        {selectedDate && !importing ? (
          <View style={styles.dayActions}>
            <Pressable
              style={styles.editChip}
              onPress={() => openForDate(selectedDate)}
            >
              <Text style={styles.editChipText}>
                {selectedNight ? 'Modifier ce jour' : 'Compléter ce jour'}
              </Text>
            </Pressable>
            {selectedNight ? (
              <Pressable
                style={styles.clearChip}
                onPress={() => onClearDate(selectedDate)}
              >
                <Text style={styles.clearChipText}>Effacer</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </FadeInUp>
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    content: { padding: spacing.lg, paddingBottom: 48 },
    hero: { fontSize: 28, fontWeight: '800', color: colors.text },
    heroSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
    primaryBtn: {
      backgroundColor: colors.sleep,
      borderRadius: radii.lg,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    fieldHint: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      lineHeight: 18,
    },
    scoreInput: {
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      fontSize: 28,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    inputExample: {
      fontWeight: '400',
    },
    durationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    durationInput: {
      width: 88,
      backgroundColor: colors.bg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 14,
      fontSize: 22,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    durationUnit: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textMuted,
      marginRight: spacing.xs,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    secondaryBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
    saveBtn: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    lastNight: {
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bg,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    lastLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    scoreBig: { fontSize: 48, fontWeight: '800' },
    scoreCaption: { fontSize: 15, fontWeight: '600', color: colors.text },
    scoreMeta: { fontSize: 13, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
    dayActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    editChip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.md,
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    editChipText: { fontWeight: '700', fontSize: 14, color: colors.text },
    clearChip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radii.md,
      alignItems: 'center',
      backgroundColor: '#FEF2F2',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#FECACA',
    },
    clearChipText: { fontWeight: '700', fontSize: 14, color: '#B91C1C' },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: 4,
    },
  });
}
