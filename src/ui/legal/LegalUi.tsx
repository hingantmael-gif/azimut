import { useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { Text } from '../Text';
import { AppTextInput } from '../AppTextInput';
import { AppScrollView } from '../scrolling';
import { PressableScale } from '../motion/softMotion';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  readingMinutes,
  sectionText,
  type CalloutTone,
  type LegalBlock,
  type LegalDoc,
  type LegalSection,
} from '../../legal/legalDocs';

type Icon = keyof typeof Ionicons.glyphMap;

/** En-tête « document » : pastille colorée, titre, version et temps de lecture. */
export function LegalHero({ doc }: { doc: LegalDoc }) {
  const minutes = readingMinutes(doc);
  return (
    <LinearGradient
      colors={[doc.color, `${doc.color}B3`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroIcon}>
        <Ionicons name={doc.icon as Icon} size={26} color="#FFFFFF" />
      </View>
      <Text style={styles.heroTitle}>{doc.title}</Text>
      <Text style={styles.heroSub}>{doc.subtitle}</Text>
      <View style={styles.heroMeta}>
        <MetaChip icon="pricetag" label={`Version ${LEGAL_VERSION}`} />
        <MetaChip icon="calendar" label={LEGAL_UPDATED} />
        <MetaChip icon="time" label={`${minutes} min de lecture`} />
      </View>
    </LinearGradient>
  );
}

function MetaChip({ icon, label }: { icon: Icon; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={12} color="#FFFFFF" />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/** « En bref » : l'essentiel en quelques puces, avant le détail. */
export function KeyPoints({ points, accent }: { points: string[]; accent: string }) {
  const { colors } = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.cardHead}>
        <Ionicons name="sparkles" size={16} color={accent} />
        <Text style={[styles.cardKicker, { color: accent }]}>EN BREF</Text>
      </View>
      {points.map((p) => (
        <View key={p} style={styles.pointRow}>
          <View style={[styles.tick, { backgroundColor: accent }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <Text style={[styles.pointText, { color: colors.text }]}>{p}</Text>
        </View>
      ))}
    </View>
  );
}

const TONES: Record<CalloutTone, { icon: Icon; color: string }> = {
  info: { icon: 'information-circle', color: '#2563EB' },
  ok: { icon: 'checkmark-circle', color: '#059669' },
  warn: { icon: 'warning', color: '#D97706' },
  danger: { icon: 'alert-circle', color: '#DC2626' },
};

function Callout({ tone, title, text }: { tone: CalloutTone; title?: string; text: string }) {
  const { colors } = useThemeColors();
  const t = TONES[tone];
  return (
    <View style={[styles.callout, { backgroundColor: `${t.color}14`, borderColor: `${t.color}55` }]}>
      <Ionicons name={t.icon} size={20} color={t.color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.calloutTitle, { color: t.color }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: colors.text }]}>{text}</Text>
      </View>
    </View>
  );
}

function BlockView({ block, accent }: { block: LegalBlock; accent: string }) {
  const { colors } = useThemeColors();
  const router = useRouter();

  switch (block.type) {
    case 'p':
      return <Text style={[styles.body, { color: colors.textSecondary }]}>{block.text}</Text>;
    case 'ul':
      return (
        <View style={{ gap: 8 }}>
          {block.items.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text style={[styles.body, styles.flex1, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={{ gap: 10 }}>
          {block.items.map((item, i) => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.stepNum, { backgroundColor: accent }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.body, styles.flex1, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'callout':
      return <Callout tone={block.tone} title={block.title} text={block.text} />;
    case 'cards':
      return (
        <View style={{ gap: 10 }}>
          {block.items.map((c) => (
            <View
              key={c.title}
              style={[styles.dataCard, { backgroundColor: colors.bg, borderColor: colors.border }]}
            >
              <Text style={[styles.dataTitle, { color: colors.text }]}>{c.title}</Text>
              {c.lines.map((l) => (
                <View key={l.label} style={styles.dataLine}>
                  <Text style={[styles.dataLabel, { color: accent }]}>{l.label}</Text>
                  <Text style={[styles.dataValue, { color: colors.textSecondary }]}>{l.value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case 'link':
      return (
        <PressableScale
          variant="subtle"
          onPress={() => router.push(`/settings/legal/${block.doc}` as Href)}
          style={[styles.linkBtn, { borderColor: accent }]}
          accessibilityLabel={block.label}
        >
          <View style={styles.linkInner}>
            <Text style={[styles.linkText, { color: accent }]}>{block.label}</Text>
            <Ionicons name="arrow-forward" size={16} color={accent} />
          </View>
        </PressableScale>
      );
  }
}

function Section({
  index,
  section,
  open,
  onToggle,
  accent,
}: {
  index: number;
  section: LegalSection;
  open: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const { colors } = useThemeColors();
  // Le numéro est déjà dans le titre des textes (« 1. … ») : on l'affiche en pastille à la place.
  const title = section.title.replace(/^\d+\.\s*/, '');
  return (
    <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: open ? accent : colors.border }]}>
      <PressableScale
        variant="subtle"
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={section.title}
      >
        <View style={styles.sectionHead}>
          <View style={[styles.num, { backgroundColor: `${accent}22` }]}>
            <Text style={[styles.numText, { color: accent }]}>{index + 1}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
            {section.summary && !open ? (
              <Text style={[styles.sectionSummary, { color: colors.textMuted }]} numberOfLines={2}>
                {section.summary}
              </Text>
            ) : null}
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>
      </PressableScale>
      {open ? (
        <View style={styles.sectionBody}>
          {section.summary ? (
            <View style={[styles.summaryPill, { backgroundColor: `${accent}14` }]}>
              <Ionicons name="bulb" size={14} color={accent} />
              <Text style={[styles.summaryText, { color: colors.text }]}>{section.summary}</Text>
            </View>
          ) : null}
          {section.blocks.map((b, i) => (
            <BlockView key={i} block={b} accent={accent} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Écran complet d'un document légal : héro, « en bref », recherche, sections dépliables. */
export function LegalDocView({ doc }: { doc: LegalDoc }) {
  const { colors } = useThemeColors();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      doc.sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => !q || sectionText(section).includes(q)),
    [doc, q],
  );
  const allOpen = visible.length > 0 && visible.every(({ section }) => open[section.id] || q);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!allOpen) for (const s of doc.sections) next[s.id] = true;
    setOpen(next);
  };

  return (
    <AppScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <LegalHero doc={doc} />

      {doc.intro && doc.id !== 'terms' ? (
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{doc.intro}</Text>
      ) : null}

      {doc.keyPoints ? <KeyPoints points={doc.keyPoints} accent={doc.color} /> : null}

      {doc.sections.length > 4 ? (
        <View style={[styles.search, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher dans ce document"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Rechercher dans ce document"
          />
          {query ? (
            <PressableScale variant="subtle" onPress={() => setQuery('')} accessibilityLabel="Effacer la recherche">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>
      ) : null}

      <View style={styles.listHead}>
        <Text style={[styles.listTitle, { color: colors.textMuted }]}>
          {q ? `${visible.length} RÉSULTAT${visible.length > 1 ? 'S' : ''}` : 'SOMMAIRE'}
        </Text>
        {!q ? (
          <PressableScale variant="subtle" onPress={toggleAll} accessibilityLabel={allOpen ? 'Tout replier' : 'Tout déplier'}>
            <Text style={[styles.expandAll, { color: doc.color }]}>{allOpen ? 'Tout replier' : 'Tout déplier'}</Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        {visible.map(({ section, index }) => (
          <Section
            key={section.id}
            index={index}
            section={section}
            open={Boolean(q) || Boolean(open[section.id])}
            onToggle={() => setOpen((o) => ({ ...o, [section.id]: !o[section.id] }))}
            accent={doc.color}
          />
        ))}
        {visible.length === 0 ? (
          <Text style={[styles.body, { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg }]}>
            Aucun résultat pour « {query} ».
          </Text>
        ) : null}
      </View>

      <ContactCard accent={doc.color} />
    </AppScrollView>
  );
}

/** Bloc contact commun : une question sur ce document ? */
export function ContactCard({ accent }: { accent: string }) {
  const { colors } = useThemeColors();
  const [copied, setCopied] = useState(false);

  // Ouvre l'appli e-mail de l'appareil avec un message pré-rempli. Le message part de TA
  // boîte mail vers l'adresse de contact de Mova ; rien n'est envoyé automatiquement.
  const open = () => {
    const subject = encodeURIComponent('Mova — question');
    void Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}?subject=${subject}`).catch(() => copy());
  };

  // Aucune appli e-mail configurée (ordinateur, navigateur) : on copie l'adresse.
  const copy = () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(LEGAL_CONTACT_EMAIL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, gap: 10 }]}>
      <View style={styles.contact}>
        <Ionicons name="mail" size={22} color={accent} />
        <View style={styles.flex1}>
          <Text style={[styles.dataTitle, { color: colors.text }]}>Une question ?</Text>
          <Text selectable style={[styles.sectionSummary, { color: colors.textMuted }]}>
            {LEGAL_CONTACT_EMAIL}
          </Text>
        </View>
      </View>
      <Text style={[styles.sectionSummary, { color: colors.textSecondary }]}>
        « Écrire » ouvre ton application e-mail avec un message prêt à envoyer : il part de ta boîte
        vers l’adresse ci-dessus et n’est lu que par l’équipe Mova.
      </Text>
      <View style={styles.contact}>
        <PressableScale variant="subtle" onPress={open} accessibilityLabel="Écrire à Mova" style={[styles.contactBtn, { backgroundColor: accent }]}>
          <Text style={styles.contactBtnText}>Écrire</Text>
        </PressableScale>
        {Platform.OS === 'web' ? (
          <PressableScale variant="subtle" onPress={copy} accessibilityLabel="Copier l’adresse e-mail" style={[styles.contactBtn, { borderWidth: 1.5, borderColor: accent }]}>
            <Text style={[styles.contactBtnText, { color: accent }]}>{copied ? 'Copié ✓' : 'Copier l’adresse'}</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const webNoOutline =
  Platform.OS === 'web'
    ? ({ outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as object)
    : null;

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.md },
  flex1: { flex: 1 },
  hero: { borderRadius: radii.xl, padding: spacing.lg, overflow: 'hidden' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 4 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  chipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  intro: { fontSize: 15, lineHeight: 23 },
  card: { borderRadius: radii.xl, borderWidth: 1, padding: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  cardKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 },
  tick: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12, ...webNoOutline },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  listTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  expandAll: { fontSize: 13, fontWeight: '800' },
  section: { borderRadius: radii.xl, borderWidth: 1.5, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  num: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 14, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  sectionSummary: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  sectionBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 12 },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radii.md,
  },
  summaryText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 23 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  callout: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  calloutTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  dataCard: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 6 },
  dataTitle: { fontSize: 15, fontWeight: '800' },
  dataLine: { gap: 1, marginTop: 4 },
  dataLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  dataValue: { fontSize: 14, lineHeight: 20 },
  linkBtn: { borderWidth: 1.5, borderRadius: radii.lg },
  linkInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: { fontSize: 14, fontWeight: '800' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.md },
  contactBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
