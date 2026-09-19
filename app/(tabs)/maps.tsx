import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import {
  ExplorerRoutesMap,
  explorerRouteColor,
  type ExplorerRoute,
} from '../../src/ui/ExplorerRoutesMap';
import { formatDuration } from '../../src/engines/core';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';
import { AppScrollView } from '../../src/ui/scrolling';
import { PrimaryButton } from '../../src/ui/primitives';

/** Cartes — tous les tracés GPS des séances sur une même carte. */
export default function MapsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [focusId, setFocusId] = useState<string | null>(null);

  const tracked = useMemo(() => {
    return state.activities
      .filter((a) => (a.streams?.latlng?.length ?? 0) >= 2)
      .slice()
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [state.activities]);

  const routes: ExplorerRoute[] = useMemo(
    () =>
      tracked.map((a, i) => ({
        id: a.id,
        latlng: a.streams!.latlng as [number, number][],
        color: explorerRouteColor(i),
        label: a.name,
      })),
    [tracked],
  );

  return (
    <AppScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      <Text style={styles.title}>Cartes & parcours</Text>
      <Text style={styles.sub}>
        Tous tes tracés GPS sur une même carte — où tu as déjà couru, et ce qu’il reste à
        explorer.
      </Text>

      <ExplorerRoutesMap
        routes={routes}
        height={340}
        focusId={focusId}
        emptyLabel="Aucune séance GPS pour l’instant. Enregistre une sortie (Enregistrer) : le trajet s’affichera ici, même dans une autre ville."
      />

      <Text style={styles.section}>
        {tracked.length > 0
          ? `${tracked.length} parcours GPS`
          : 'Parcours GPS'}
      </Text>

      {tracked.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Pas encore de tracé</Text>
          <Text style={styles.emptyBody}>
            Dès qu’une séance a un GPS (live ou import), elle apparaît sur la carte — une
            ville, puis une autre, le même plan.
          </Text>
          <PrimaryButton
            label="Enregistrer une séance"
            onPress={() => router.push('/(tabs)/record')}
          />
        </View>
      ) : (
        tracked.map((a, i) => {
          const on = focusId === a.id;
          const km = (a.distanceM / 1000).toFixed(1).replace('.', ',');
          const date = a.startDate.slice(0, 10);
          return (
            <Pressable
              key={a.id}
              style={[
                styles.row,
                on && { borderColor: explorerRouteColor(i), backgroundColor: colors.bgElevated },
              ]}
              onPress={() => setFocusId((prev) => (prev === a.id ? null : a.id))}
              onLongPress={() =>
                router.push(`/activity/${encodeURIComponent(a.id)}`)
              }
              accessibilityRole="button"
              accessibilityLabel={`${a.name}, ${km} kilomètres`}
            >
              <View
                style={[styles.dot, { backgroundColor: explorerRouteColor(i) }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={styles.rowMeta}>
                  {date} · {km} km · {formatDuration(a.movingSec)}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push(`/activity/${encodeURIComponent(a.id)}`)
                }
              >
                <Text style={styles.open}>Voir ›</Text>
              </Pressable>
            </Pressable>
          );
        })
      )}
    </AppScrollView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgSecondary, padding: spacing.md },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 6,
    },
    sub: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    section: {
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      marginBottom: 8,
    },
    dot: { width: 12, height: 12, borderRadius: 6 },
    rowTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
    rowMeta: { marginTop: 2, fontSize: 12, color: colors.textMuted },
    open: { fontWeight: '800', color: colors.accent, fontSize: 13 },
    emptyCard: {
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      gap: 10,
    },
    emptyTitle: { fontWeight: '800', fontSize: 16, color: colors.text },
    emptyBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      marginBottom: 4,
    },
  });
}
