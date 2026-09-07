import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../src/constants/support';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { AppScrollView } from '../../src/ui/scrolling';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import type { ColorPalette } from '../../src/theme/palettes';

type FaqItem = {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  href?: string;
};

const FAQ: FaqItem[] = [
  {
    id: 'cover',
    title: 'Fonds de profil',
    body:
      'Paramètres → Fond profil. Choisis un style, un fond lié à ton record (course, vélo, natation) ou à ton rang. Les fonds animés bougent sur ton profil ; les fonds verrouillés s’ouvrent avec un record ou un rang suffisant.',
    actionLabel: 'Ouvrir les fonds',
    href: '/settings/profile-cover',
  },
  {
    id: 'access',
    title: 'Accès & confidentialité',
    body:
      'Tu contrôles qui voit ton profil (public, abonnés, privé) dans Paramètres → Contrôles de confidentialité. Les mentions @identifiant dans ta bio ouvrent le profil concerné.',
    actionLabel: 'Réglages confidentialité',
    href: '/settings/privacy',
  },
  {
    id: 'animation',
    title: 'Animations (niveau & programme)',
    body:
      'Quand tu gagnes un niveau, une animation s’affiche partout dans l’app. Pendant la création ou la mise à jour d’un programme (import, feedback), elle attend la fin du parcours. Après « Nouveau programme », une confirmation montre que le plan a bien été généré.',
  },
  {
    id: 'level',
    title: 'Niveaux & classement',
    body:
      'L’XP de carrière monte avec les séances, likes, présence quotidienne et badges. Les premiers niveaux sont rapides ; plus haut, chaque niveau demande plus d’XP. La ligue (Bronze → Champion) se tranche chaque lundi dans un peloton — ouvre Classement pour les détails.',
    actionLabel: 'Voir le classement',
    href: '/ranked',
  },
  {
    id: 'program',
    title: 'Créer un programme',
    body:
      'Depuis Accueil ou Profil, lance « Nouveau programme », choisis sport / durée / options, puis génère. Tu peux ajouter un programme en parallèle : Répartir (autres jours + repos entre qualités/renfos) ou Superposer (mêmes jours, séances allégées).',
    actionLabel: 'Nouveau programme',
    href: '/program/new',
  },
  {
    id: 'import',
    title: 'Importer une activité',
    body:
      'Depuis Accueil → Importer. Après import, suis les étapes proposées pour mettre à jour ton plan. Les animations de niveau n’interrompent pas ces étapes : elles arrivent à la fin.',
    actionLabel: 'Importer',
    href: '/import-activity',
  },
  {
    id: 'watch',
    title: 'Montre & sommeil',
    body:
      'Paramètres → Montre pour indiquer ta marque. Corps → Sommeil pour importer ou saisir une nuit. Le score nuit peut alléger le début d’un programme.',
    actionLabel: 'Configurer la montre',
    href: '/settings/watch',
  },
  {
    id: 'subscription',
    title: 'Fonctionnalités',
    body:
      'L’écran Fonctionnalités liste tout ce que propose Azimut (coaching, Strava, Garmin, classement…). Touche une ligne pour ouvrir directement l’écran — et le bouton d’action quand c’est possible.',
    actionLabel: 'Voir les fonctionnalités',
    href: '/settings/subscription',
  },
];

function FaqRow({
  item,
  open,
  onToggle,
  onAction,
  colors,
  styles,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
  onAction?: () => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.faqCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Pressable onPress={onToggle} accessibilityRole="button">
        <View style={styles.faqHead}>
          <Text style={[styles.faqTitle, { color: colors.text }]}>{item.title}</Text>
          <Text style={[styles.faqChevron, { color: colors.textMuted }]}>
            {open ? '▾' : '▸'}
          </Text>
        </View>
      </Pressable>
      {open ? (
        <View style={styles.faqBody}>
          <Text style={[styles.faqText, { color: colors.textSecondary }]}>{item.body}</Text>
          {item.actionLabel && onAction ? (
            <Pressable
              style={[styles.faqCta, { backgroundColor: colors.accent }]}
              onPress={onAction}
            >
              <Text style={styles.faqCtaText}>{item.actionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Centre d’aide — FAQ in-app + liens utiles. */
export default function HelpScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [openId, setOpenId] = useState<string | null>('cover');

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <AboutBrandMark />
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Réponses rapides sur les fonds, le niveau, les programmes et l’accès au profil.
        </Text>

        <SettingsSection title="Questions fréquentes">
          <View style={styles.faqList}>
            {FAQ.map((item) => (
              <FaqRow
                key={item.id}
                item={item}
                open={openId === item.id}
                onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
                onAction={
                  item.href ? () => router.push(item.href as Href) : undefined
                }
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow
            label="Contacter le support"
            value={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(SUPPORT_MAILTO)}
          />
          <SettingsRow
            label="Conditions d'utilisation"
            onPress={() => router.push('/settings/terms')}
          />
          <SettingsRow
            label="Politique de confidentialité"
            onPress={() => router.push('/settings/privacy-policy')}
          />
        </SettingsSection>
      </AppScrollView>
    </SettingsScreen>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    intro: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      fontSize: 14,
      lineHeight: 20,
    },
    faqList: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    faqCard: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    faqHead: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      gap: spacing.sm,
    },
    faqTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
    faqChevron: { fontSize: 14, fontWeight: '700' },
    faqBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.sm,
    },
    faqText: { fontSize: 14, lineHeight: 20 },
    faqCta: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
    },
    faqCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  });
}
