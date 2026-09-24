import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/ui/Text';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Body, PrimaryButton, Screen, SecondaryButton, Title } from '../src/ui/primitives';
import { useApp, todayWorkout } from '../src/store/AppContext';
import {
  formatImportedSummary,
  parseActivityFile,
  type ImportedActivityMetrics,
} from '../src/engines/activityFileImport';
import {
  DUPLICATE_ACTIVITY_MESSAGE,
  findDuplicateActivity,
} from '../src/engines/activityDuplicate';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import { detectSportFromActivity } from '../src/engines/sportSessionAnalysis';
import { matchActivityToPlanned } from '../src/engines/activityPlanMatch';
import { useActionFocus } from '../src/hooks/useActionFocus';
import { FocusTarget } from '../src/ui/FocusTarget';
import { AppScrollView } from '../src/ui/scrolling';
import { openStravaWebForGpxExport } from '../src/engines/stravaExport';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';
import {
  peekUsageQuotaAllowed,
  takeUsageQuotaIfNeeded,
} from '../src/premium/guardQuota';
import { PaywallSheet } from '../src/ui/premium';

export default function ImportActivityScreen() {
  const { dispatch, state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportedActivityMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openingStrava, setOpeningStrava] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const planned = todayWorkout(state.plan);
  const focusPick = useActionFocus('pick');
  // « C'est ma séance prévue » : proposé d'office si la sortie ressemble à celle du jour, modifiable.
  const [linkOverride, setLinkOverride] = useState<boolean | null>(null);
  const planMatch = useMemo(
    () => (preview ? matchActivityToPlanned({ ...preview, sport: sportOfPreview(preview, planned) }, planned) : null),
    [preview, planned],
  );
  const linkToPlanned = linkOverride ?? planMatch?.matches ?? false;

  const ingest = useCallback(
    async (activity: ImportedActivityMetrics) => {
      if (importing) return;
      const dup = findDuplicateActivity(activity, state.activities);
      if (dup) {
        setError(DUPLICATE_ACTIVITY_MESSAGE);
        return;
      }
      const quota = await takeUsageQuotaIfNeeded('import', state.profile);
      if (quota === 'paywall') {
        setPaywall(true);
        return;
      }
      setImporting(true);
      try {
        const detected = detectSportFromActivity(activity, planned);
        const sportStore =
          detected === 'bike' || detected === 'swim' || detected === 'strength'
            ? detected
            : detected === 'trail' || detected === 'run' || detected === 'brick'
              ? 'run'
              : 'other';
        dispatch({
          type: 'INGEST_STRAVA',
          activity: {
            id: activity.id,
            name: activity.name,
            distanceM: activity.distanceM,
            elapsedSec: activity.elapsedSec,
            movingSec: activity.movingSec,
            startDate: activity.startDate,
            streams: activity.streams,
            avgHr: activity.avgHr,
            maxHr: activity.maxHr,
            avgPaceSecPerKm: activity.avgPaceSecPerKm,
            sport: sportStore,
          },
          plannedId:
            planned && planned.discipline !== 'rest' && linkToPlanned ? planned.id : undefined,
        });
        router.replace(`/activity/${encodeURIComponent(activity.id)}` as '/activity/[id]');
      } catch {
        setError('Import impossible. Réessayez.');
        setImporting(false);
      }
    },
    [dispatch, importing, planned, router, state.activities, state.profile, linkToPlanned],
  );

  const handleContent = useCallback((name: string, text: string) => {
    try {
      setLinkOverride(null);
      const parsed = parseActivityFile(name, text);
      if (parsed.distanceM < 50 && parsed.pointCount < 5) {
        setError(
          'Fichier quasi vide. Sur Strava Web, utilisez Exporter (pas Partager) : fichier .gpx ou .tcx.',
        );
        setPreview(null);
        return;
      }
      const dup = findDuplicateActivity(parsed, state.activities);
      if (dup) {
        setPreview(null);
        setError(DUPLICATE_ACTIVITY_MESSAGE);
        return;
      }
      setError(null);
      setPreview(parsed);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Lecture impossible');
    }
  }, [state.activities]);

  const pickFile = async () => {
    const allowed = await peekUsageQuotaAllowed('import', state.profile);
    if (!allowed) {
      setPaywall(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        await new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.gpx,.tcx,application/gpx+xml,application/xml,text/xml';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) {
              resolve();
              return;
            }
            const text = await file.text();
            handleContent(file.name, text);
            resolve();
          };
          input.click();
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/gpx+xml',
            'application/xml',
            'text/xml',
            'application/octet-stream',
            '*/*',
          ],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        const res = await fetch(asset.uri);
        const text = await res.text();
        handleContent(asset.name ?? 'activity.gpx', text);
      }
    } catch {
      setError('Impossible d’ouvrir le fichier.');
    } finally {
      setBusy(false);
    }
  };

  const openStravaWeb = async () => {
    setOpeningStrava(true);
    setError(null);
    try {
      await openStravaWebForGpxExport();
    } catch {
      setError('Impossible d’ouvrir Strava Web. Réessayez ou allez sur strava.com.');
    } finally {
      setOpeningStrava(false);
    }
  };

  const pickLabel = busy ? 'Ouverture…' : 'Choisir un fichier GPX / TCX';

  return (
    <Screen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Title>Importer depuis Strava</Title>
        <View style={{ marginTop: spacing.md }} pointerEvents="box-none">
          <SportAtmosphereBanner
            source={ATMOSPHERE_IMAGES.run}
            title="Ta sortie, toutes les infos"
            subtitle="Distance, FC, allure — via un export GPX / TCX"
            height={168}
          />
        </View>

        <Pressable
          style={styles.box}
          onPress={() => setHelpOpen((o) => !o)}
          accessibilityRole="button"
        >
          <Text style={styles.boxTitle}>
            Comment obtenir toutes les infos de mon activité {helpOpen ? '▾' : '▸'}
          </Text>
          {helpOpen ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={styles.step}>
                1. Appuyez sur <Text style={styles.em}>Ouvrir Strava Web</Text> (ci-dessous) —
                connectez-vous avec e-mail et mot de passe.
              </Text>
              <Text style={styles.step}>
                2. Sur téléphone : dans le navigateur, activez{' '}
                <Text style={styles.em}>Version ordinateur</Text> (menu ⋮ ou Aa) — sinon
                l’export GPX n’apparaît souvent pas.
              </Text>
              <Text style={styles.step}>
                3. Ouvrez l’activité → menu ··· →{' '}
                <Text style={styles.em}>Exporter GPX</Text> (ou TCX pour la FC).
              </Text>
              <Text style={styles.step}>
                4. Revenez ici → <Text style={styles.em}>Choisir un fichier GPX / TCX</Text> et
                sélectionnez le fichier téléchargé.
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.warn}>
          <Text style={styles.warnText}>
            « Partager mon activité » dans l’app Strava envoie seulement un lien web — pas la
            distance, la FC ni l’allure. Il faut un fichier GPX/TCX depuis le site Strava
            (version ordinateur sur téléphone).
          </Text>
        </View>

        <FocusTarget active={focusPick} style={{ marginTop: spacing.sm }}>
          <PrimaryButton
            label={pickLabel}
            disabled={busy}
            onPress={() => void pickFile()}
          />
        </FocusTarget>

        <View style={{ marginTop: spacing.sm }}>
          <SecondaryButton
            label={openingStrava ? 'Ouverture de Strava…' : 'Ouvrir Strava Web'}
            onPress={() => void openStravaWeb()}
          />
        </View>
        <Text style={styles.hintUnder}>
          Ouvre « Mes activités » (strava.com/athlete/training). Sur téléphone :
          activez « Version ordinateur », exportez le GPX/TCX, puis choisissez le
          fichier ci-dessus.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {preview ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>{preview.name}</Text>
            <Body style={{ marginTop: 6 }}>{formatImportedSummary(preview)}</Body>
            {planned && planned.discipline !== 'rest' ? (
              <Pressable
                style={[styles.matchBox, linkToPlanned && styles.matchBoxOn]}
                onPress={() => setLinkOverride(!linkToPlanned)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: linkToPlanned }}
              >
                <Text style={styles.matchTitle}>
                  {linkToPlanned ? '✓ Comptée pour ta séance prévue' : 'Non liée à ta séance prévue'}
                </Text>
                <Text style={styles.matchText}>
                  {planMatch?.matches ? 'Cette sortie ressemble à « ' + planned.title + ' ». ' : '« ' + planned.title + ' » est prévue aujourd’hui. '}
                  {(planMatch?.reasons ?? []).join(' · ')}
                  {linkToPlanned ? ' Touche pour ne pas la lier.' : ' Touche pour la lier à cette séance.'}
                </Text>
              </Pressable>
            ) : null}
            <PrimaryButton
              label={importing ? 'Import…' : 'Confirmer l’import'}
              disabled={importing}
              onPress={() => void ingest(preview)}
            />
          </View>
        ) : null}
      </AppScrollView>
      <PaywallSheet
        visible={paywall}
        reason="import_quota"
        onClose={() => setPaywall(false)}
      />
    </Screen>
  );
}

/** Sport de l'import (même règle que l'enregistrement de l'activité). */
function sportOfPreview(a: ImportedActivityMetrics, planned: ReturnType<typeof todayWorkout>): 'run' | 'bike' | 'swim' | 'strength' | 'other' {
  const d = detectSportFromActivity(a, planned ?? undefined);
  return d === 'bike' || d === 'swim' || d === 'strength' ? d : d === 'trail' || d === 'run' || d === 'brick' ? 'run' : 'other';
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    matchBox: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
    matchBoxOn: { borderColor: colors.accent, backgroundColor: colors.accentLight },
    matchTitle: { fontWeight: '800', color: colors.text, fontSize: 14 },
    matchText: { marginTop: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
    box: {
      marginTop: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.bgElevated,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    boxTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    step: { color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 2 },
    em: { fontWeight: '700', color: colors.text },
    warn: {
      marginTop: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.accentLight,
      borderRadius: radii.md,
    },
    warnText: { color: colors.accentDark, fontSize: 13, lineHeight: 19 },
    hintUnder: {
      marginTop: spacing.sm,
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    error: { color: colors.danger, marginTop: spacing.sm, fontSize: 14 },
    preview: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.bg,
      gap: spacing.md,
    },
    previewTitle: { fontWeight: '800', fontSize: 17, color: colors.text },
  });
}
