import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import { computeProgramEvolution } from '../src/engines/programProgress';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import type { ColorPalette } from '../src/theme/palettes';
import type { ActiveProgram } from '../src/types/domain';
import { AppScrollView } from '../src/ui/scrolling';
import { PressableScale } from '../src/ui/motion/softMotion';
import { ProgramUsageBoard } from '../src/ui/program/ProgramUsageBoard';
import { ProgramSportCover } from '../src/ui/program/SportCover';
import { formatProgramDurationLabel } from '../src/constants/programs';
import { NewProgramLabel } from '../src/ui/brand/NewProgramLabel';
import { resolveActivePrograms } from '../src/engines/multiProgramPlan';
import { programReviewEmoji, programReviewLabel } from '../src/ui/program/ProgramReviewCard';

/** Tous les programmes — en cours et terminés + classement d’usage */
export default function ProgramsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const activePrograms = resolveActivePrograms(state.profile);
  const history = state.profile.programHistory ?? [];

  return (
    <AppScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <ProgramUsageBoard
        countedTemplateId={state.profile.programUsageCountedId}
        limit={8}
        mixed
      />

      <PressableScale
        style={styles.newBtn}
        onPress={() => router.push('/program/new')}
      >
        <NewProgramLabel color="#fff" size={16} style={styles.newBtnText} />
      </PressableScale>

      <Text style={styles.section}>En cours</Text>
      {activePrograms.length > 0 ? (
        activePrograms.map((prog) => (
          <ProgramCard
            key={prog.id}
            prog={prog}
            badge="Actif"
            badgeColor={colors.accent}
            styles={styles}
            onPress={() =>
              router.push(`/program/detail?scope=active&id=${encodeURIComponent(prog.id)}`)
            }
          />
        ))
      ) : (
        <Text style={styles.empty}>Aucun programme actif.</Text>
      )}

      <Text style={styles.section}>Terminés</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>Pas encore de programme terminé.</Text>
      ) : (
        history.map((prog) => {
          const evo = computeProgramEvolution(prog);
          return (
            <ProgramCard
              key={`${prog.id}-${prog.completedAt ?? prog.startedAt}`}
              prog={prog}
              badge="Terminé"
              badgeColor={colors.textMuted}
              styles={styles}
              gain={
                evo.hasBaseline && evo.hasCurrent && evo.gainLabel
                  ? {
                      label: evo.gainLabel,
                      metric: evo.label,
                      up: evo.improved,
                    }
                  : undefined
              }
              onPress={() =>
                router.push(
                  `/program/detail?scope=history&id=${encodeURIComponent(prog.id)}&at=${encodeURIComponent(prog.completedAt ?? prog.startedAt)}`,
                )
              }
            />
          );
        })
      )}
    </AppScrollView>
  );
}

function ProgramCard({
  prog,
  badge,
  badgeColor,
  gain,
  styles,
  onPress,
}: {
  prog: ActiveProgram;
  badge: string;
  badgeColor: string;
  gain?: { label: string; metric: string; up: boolean };
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const { colors } = useThemeColors();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <ProgramSportCover
        sportCategory={prog.sportCategory}
        catalogId={prog.catalogId}
        minHeight={132}
        borderRadius={radii.lg}
        style={styles.cardCover}
        scrim="rgba(7,17,31,0.5)"
      >
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {prog.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={[styles.badgeText, { color: '#fff' }]}>{badge}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>{prog.subtitle}</Text>
        {gain ? (
          <Text
            style={[
              styles.gain,
              { color: gain.up ? '#86EFAC' : '#FCA5A5' },
            ]}
          >
            Bilan : {gain.label} sur {gain.metric}
          </Text>
        ) : null}
        {prog.completedAt ? (
          programReviewLabel(prog.reviewFeeling) ? (
            <Text style={styles.reviewLine}>
              {programReviewEmoji(prog.reviewFeeling)}{' '}
              {programReviewLabel(prog.reviewFeeling)}
              {prog.reviewComment ? ` — « ${prog.reviewComment} »` : ''}
            </Text>
          ) : (
            <Text style={styles.reviewHint}>Ajouter un avis (pouce) →</Text>
          )
        ) : null}
        <Text style={styles.meta}>
          {formatProgramDurationLabel(prog)}
          {prog.completedAt
            ? ` · ${new Date(prog.completedAt).toLocaleDateString('fr-FR')}`
            : prog.startedAt
              ? ` · démarré ${new Date(prog.startedAt).toLocaleDateString('fr-FR')}`
              : ''}
          {' · ouvrir →'}
        </Text>
      </ProgramSportCover>
    </Pressable>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary },
    newBtn: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      paddingVertical: 14,
      borderRadius: radii.lg,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    newBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
    section: {
      marginHorizontal: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    empty: {
      marginHorizontal: spacing.md,
      color: colors.textMuted,
      fontSize: 14,
    },
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      overflow: 'hidden',
    },
    cardCover: {
      borderRadius: radii.lg,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    cardTitle: {
      flex: 1,
      fontWeight: '800',
      fontSize: 16,
      color: '#fff',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    badgeText: { fontSize: 11, fontWeight: '800' },
    cardSub: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.88)',
      fontSize: 13,
    },
    gain: { marginTop: 8, fontSize: 14, fontWeight: '700' },
    reviewLine: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 17,
    },
    reviewHint: {
      marginTop: 6,
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
    },
    meta: {
      marginTop: 6,
      color: 'rgba(255,255,255,0.95)',
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
