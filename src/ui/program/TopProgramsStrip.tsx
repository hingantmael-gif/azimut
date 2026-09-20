import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../Text';
import { SportArt, artKindFor } from './SportArt';
import { buildMixedProgramUsageRanking, usageCountLabel } from '../../engines/programPopularity';
import { findProgramById } from '../../constants/programs';
import { radii, spacing } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeContext';

const MEDALS = ['#EAB308', '#CBD5E1', '#D97706', '#64748B', '#64748B'];

/**
 * « Les programmes du moment » : le top 5 des plus utilisés, en cartes à faire défiler.
 * Un appui ouvre l'assistant sur ce programme. Mis en avant sur l'accueil et à l'entrée de « Nouveau programme ».
 */
export function TopProgramsStrip({
  countedTemplateIds,
  dark = false,
}: {
  countedTemplateIds?: string | string[] | null;
  /** true sur les fonds sombres (assistant). */
  dark?: boolean;
}) {
  const router = useRouter();
  const { colors } = useThemeColors();
  const rows = useMemo(
    () => buildMixedProgramUsageRanking(countedTemplateIds, new Date(), 5).slice(0, 5),
    [countedTemplateIds],
  );
  if (rows.length === 0) return null;
  const text = dark ? '#FFFFFF' : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.72)' : colors.textMuted;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="trophy" size={18} color="#EAB308" />
        <Text style={[styles.title, { color: text }]}>Les plus utilisés</Text>
        <Pressable onPress={() => router.push('/programs')} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.more, { color: dark ? '#5EF2B4' : colors.accent }]}>Voir tout ›</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {rows.map((r, i) => {
          const tpl = findProgramById(r.templateId);
          return (
            <Pressable
              key={r.templateId}
              onPress={() => router.push({ pathname: '/program/new', params: { templateId: r.templateId } })}
              accessibilityRole="button"
              accessibilityLabel={`${r.title}, numéro ${i + 1} des programmes les plus utilisés`}
              style={styles.cardWrap}
            >
              <SportArt kind={artKindFor(tpl?.sportCategory ?? r.sportCategory)} seed={i * 11 + 3} height={132} borderRadius={radii.lg} animated={false}>
                <View style={[styles.medal, { backgroundColor: MEDALS[i] }]}>
                  <Text style={styles.medalText}>{i + 1}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={styles.cardCount}>{usageCountLabel(r.count)} lancés</Text>
                </View>
              </SportArt>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={[styles.hint, { color: muted }]}>Touche un programme pour le démarrer.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, marginBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  more: { fontSize: 13, fontWeight: '700' },
  row: { gap: 10, paddingRight: spacing.md },
  cardWrap: { width: 168 },
  medal: { position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontSize: 14, fontWeight: '900', color: '#0B1B2B' },
  cardText: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  cardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  cardCount: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 6 },
});
