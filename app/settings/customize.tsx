import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../../src/ui/Text';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { AppScrollView } from '../../src/ui/scrolling';
import { Card, Chip, PrimaryButton, SecondaryButton } from '../../src/ui/primitives';
import { SettingsScreen, SettingsToggleRow } from '../../src/ui/settings/SettingsList';
import { AuroraPattern } from '../../src/ui/atmosphere/AuroraPatterns';
import { MotionScaleContext } from '../../src/ui/atmosphere/LoopView';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { shouldEnforceFreeLimits } from '../../src/premium/entitlement';
import { atmosphereBase, mixHex } from '../../src/theme/sportTints';
import { systemFontFamily } from '../../src/theme/fonts';
import {
  hexToHue,
  hslToHex,
  normalizeCustomTheme,
  parseHexInput,
  PATTERN_LABELS,
  PATTERN_ORDER,
  SWATCHES,
  THEME_PRESETS,
  type ButtonPress,
  type ButtonShape,
  type ButtonStyle,
  type CardRadius,
  type CardStyle,
  type CustomTheme,
  type FontChoice,
  type MotionLevel,
  type PatternId,
  type TextScale,
} from '../../src/theme/customTheme';

type Tab = 'themes' | 'background' | 'colors' | 'buttons' | 'cards' | 'text';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'themes', label: 'Thèmes' },
  { id: 'background', label: 'Fond d’écran' },
  { id: 'colors', label: 'Couleurs' },
  { id: 'buttons', label: 'Boutons' },
  { id: 'cards', label: 'Cartes' },
  { id: 'text', label: 'Écriture' },
];

const PATTERN_ICON: Record<PatternId, keyof typeof Ionicons.glyphMap> = {
  none: 'ban',
  aurora: 'sparkles',
  topo: 'earth',
  waves: 'water',
  dunes: 'sunny',
  ripples: 'radio-button-on',
  stars: 'star',
  bubbles: 'ellipse-outline',
  rain: 'rainy',
  rays: 'sunny-outline',
  grid: 'grid',
  triangles: 'triangle',
  chevrons: 'chevron-up',
  confetti: 'balloon',
  speed: 'speedometer',
  orbits: 'planet',
  embers: 'flame',
  hex: 'apps',
  bars: 'stats-chart',
  dots: 'contrast',
};

/**
 * « Personnaliser l'application » (Premium) : fond d'écran, couleurs, boutons, cartes, écriture.
 * Sans personnalisation, l'application standard reste telle quelle. Chaque choix s'applique tout de suite à
 * tout l'écran ; les contrastes (texte des boutons, couleurs trop claires) se corrigent automatiquement.
 */
export default function CustomizeScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const { colors, isDark, custom } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const p = state.profile;
  const allowed = !shouldEnforceFreeLimits({ plan: p.plan, subscription: p.subscription, premiumSource: p.premiumSource });
  const theme: CustomTheme = useMemo(() => normalizeCustomTheme(p.customTheme), [p.customTheme]);
  const [tab, setTab] = useState<Tab>('themes');

  const save = (patch: Partial<CustomTheme>) => {
    if (!allowed) return;
    dispatch({ type: 'UPDATE_PROFILE', patch: { customTheme: { ...theme, ...patch, active: patch.active ?? true } } });
  };
  const reset = () => dispatch({ type: 'UPDATE_PROFILE', patch: { customTheme: undefined } });

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Personnaliser l’application</Text>
        <Text style={styles.sub}>
          Fond d’écran, couleurs, boutons, cartes, écriture : compose l’application à ton image. Sans personnalisation, tu gardes l’application
          standard.
        </Text>

        {!allowed ? (
          <Card variant="solid" style={{ marginTop: spacing.md, gap: spacing.sm, borderColor: colors.premium }}>
            <View style={styles.premiumRow}>
              <Ionicons name="diamond" size={20} color={colors.premium} />
              <Text style={styles.premiumTitle}>Réservé aux membres Premium</Text>
            </View>
            <Text style={styles.hint}>Tu peux tout regarder ci-dessous. Passe Premium pour appliquer tes choix à toute l’application.</Text>
            <PrimaryButton label="Découvrir Premium" onPress={() => router.push('/settings/subscription')} />
          </Card>
        ) : null}

        <View style={{ marginTop: spacing.md }}>
          <SettingsToggleRow
            label="Personnalisation activée"
            subtitle={custom ? 'Ton style est appliqué partout.' : 'L’application standard est affichée.'}
            value={Boolean(custom)}
            onToggle={() => allowed && save({ active: !theme.active })}
          />
        </View>

        <Preview styles={styles} />

        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Chip key={t.id} label={t.label} selected={tab === t.id} onPress={() => setTab(t.id)} />
          ))}
        </View>

        <View pointerEvents={allowed ? 'auto' : 'none'} style={{ opacity: allowed ? 1 : 0.55 }}>
          {tab === 'themes' ? (
            <>
              <Text style={styles.label}>Thèmes prêts à l’emploi</Text>
              <View style={styles.grid}>
                {THEME_PRESETS.map((t) => (
                  <Pressable key={t.id} onPress={() => save(t.patch)} accessibilityRole="button" accessibilityLabel={t.label} style={styles.presetCell}>
                    <View style={[styles.presetSwatch, { backgroundColor: t.patch.bg1 }]}>
                      <View style={[styles.presetHalf, { backgroundColor: t.patch.bg2 }]} />
                      <View style={[styles.presetDot, { backgroundColor: t.patch.accent, borderColor: colors.bgCard }]} />
                    </View>
                    <Text style={styles.presetLabel} numberOfLines={1}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {tab === 'background' ? (
            <>
              <Text style={styles.label}>Motif</Text>
              <PatternShowcase theme={theme} styles={styles} isDark={isDark} />
              <View style={styles.grid}>
                {PATTERN_ORDER.map((id) => {
                  const on = theme.pattern === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => save({ pattern: id })}
                      accessibilityRole="button"
                      accessibilityLabel={PATTERN_LABELS[id]}
                      style={[styles.patternCell, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentLight : colors.bgCard }]}
                    >
                      <Ionicons name={PATTERN_ICON[id]} size={22} color={on ? colors.accent : colors.textSecondary} />
                      <Text style={[styles.patternLabel, on && { color: colors.accent }]} numberOfLines={1}>{PATTERN_LABELS[id]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <ColorField label="Couleur 1 du dégradé" value={theme.bg1} onChange={(v) => save({ bg1: v })} styles={styles} colors={colors} />
              <ColorField label="Couleur 2 du dégradé" value={theme.bg2} onChange={(v) => save({ bg2: v })} styles={styles} colors={colors} />
              <Text style={styles.label}>Animation du fond</Text>
              <Choices<MotionLevel>
                value={theme.motion}
                onChange={(v) => save({ motion: v })}
                options={[
                  { id: 'off', label: 'Aucune' },
                  { id: 'calm', label: 'Douce' },
                  { id: 'lively', label: 'Vive' },
                ]}
                styles={styles}
                colors={colors}
              />
            </>
          ) : null}

          {tab === 'colors' ? (
            <>
              <ColorField label="Couleur principale (boutons, icônes)" value={theme.accent} onChange={(v) => save({ accent: v })} styles={styles} colors={colors} />
              <ColorField label="Couleur secondaire (dégradés)" value={theme.accent2} onChange={(v) => save({ accent2: v })} styles={styles} colors={colors} />
              <SecondaryButton label="Utiliser mes couleurs pour le fond" onPress={() => save({ bg1: theme.accent, bg2: theme.accent2 })} />
              <Text style={styles.hint}>
                Le texte des boutons passe automatiquement en noir ou en blanc selon la couleur, et une couleur trop pâle est légèrement renforcée pour rester lisible.
              </Text>
            </>
          ) : null}

          {tab === 'buttons' ? (
            <>
              <Text style={styles.label}>Style</Text>
              <Choices<ButtonStyle>
                value={theme.buttonStyle}
                onChange={(v) => save({ buttonStyle: v })}
                options={[
                  { id: 'gradient', label: 'Dégradé' },
                  { id: 'solid', label: 'Uni' },
                  { id: 'outline', label: 'Contour' },
                  { id: 'glass', label: 'Verre' },
                ]}
                styles={styles}
                colors={colors}
              />
              <Text style={styles.label}>Forme</Text>
              <Choices<ButtonShape>
                value={theme.buttonShape}
                onChange={(v) => save({ buttonShape: v })}
                options={[
                  { id: 'soft', label: 'Arrondi' },
                  { id: 'pill', label: 'Pilule' },
                  { id: 'square', label: 'Carré' },
                ]}
                styles={styles}
                colors={colors}
              />
              <Text style={styles.label}>Au toucher</Text>
              <Choices<ButtonPress>
                value={theme.buttonPress}
                onChange={(v) => save({ buttonPress: v })}
                options={[
                  { id: 'spring', label: 'Ressort' },
                  { id: 'pulse', label: 'Gonfle' },
                  { id: 'sink', label: 'Enfonce' },
                  { id: 'none', label: 'Aucune' },
                ]}
                styles={styles}
                colors={colors}
              />
              <Text style={styles.label}>Essaie</Text>
              <PrimaryButton label="Bouton d’essai" onPress={() => undefined} />
              <SecondaryButton label="Bouton secondaire" onPress={() => undefined} />
            </>
          ) : null}

          {tab === 'cards' ? (
            <>
              <Text style={styles.label}>Style des cartes</Text>
              <Choices<CardStyle>
                value={theme.cardStyle}
                onChange={(v) => save({ cardStyle: v })}
                options={[
                  { id: 'solid', label: 'Pleine' },
                  { id: 'glass', label: 'Verre' },
                  { id: 'outline', label: 'Contour' },
                ]}
                styles={styles}
                colors={colors}
              />
              <Text style={styles.label}>Arrondi des coins</Text>
              <Choices<CardRadius>
                value={theme.cardRadius}
                onChange={(v) => save({ cardRadius: v })}
                options={[
                  { id: 'sharp', label: 'Net' },
                  { id: 'soft', label: 'Doux' },
                  { id: 'round', label: 'Très rond' },
                ]}
                styles={styles}
                colors={colors}
              />
              <Card style={{ marginTop: spacing.md }}>
                <Text style={styles.sampleTitle}>Exemple de carte</Text>
                <Text style={styles.hint}>Le style et l’arrondi se voient ici et dans tout l’application.</Text>
              </Card>
            </>
          ) : null}

          {tab === 'text' ? (
            <>
              <Text style={styles.label}>Police</Text>
              <View style={{ gap: spacing.sm }}>
                {(['standard', 'system', 'serif', 'mono'] as FontChoice[]).map((f) => {
                  const on = theme.font === f;
                  const fam = systemFontFamily(f);
                  return (
                    <Pressable
                      key={f}
                      onPress={() => save({ font: f })}
                      accessibilityRole="button"
                      style={[styles.fontRow, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentLight : colors.bgCard }]}
                    >
                      <Text style={[styles.fontName, on && { color: colors.accent }]}>{FONT_LABEL[f]}</Text>
                      <Text style={[styles.fontSample, fam ? { fontFamily: fam } : null]}>Allure 4:30 · Sortie longue</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Taille du texte</Text>
              <Choices<TextScale>
                value={theme.textScale}
                onChange={(v) => save({ textScale: v })}
                options={[
                  { id: 'normal', label: 'Normale' },
                  { id: 'large', label: 'Grande' },
                  { id: 'xlarge', label: 'Très grande' },
                ]}
                styles={styles}
                colors={colors}
              />
            </>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <SecondaryButton label="Revenir à l’application standard" onPress={reset} />
        </View>
      </AppScrollView>
    </SettingsScreen>
  );
}

const FONT_LABEL: Record<FontChoice, string> = { standard: 'Mova (standard)', system: 'Système', serif: 'Élégante', mono: 'Technique' };

/** Aperçu : ce que donne la personnalisation sur un bouton, une carte et des pastilles. */
function Preview({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
      <Text style={styles.sampleTitle}>Aperçu</Text>
      <Text style={styles.hint}>Ainsi apparaîtront tes écrans.</Text>
      <PrimaryButton label="Lancer la séance" onPress={() => undefined} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Chip label="Course" selected />
        <Chip label="Vélo" />
      </View>
    </Card>
  );
}

/** Fenêtre animée : le motif choisi, avec les couleurs choisies, en grand. */
function PatternShowcase({ theme, styles, isDark }: { theme: CustomTheme; styles: ReturnType<typeof makeStyles>; isDark: boolean }) {
  const [c1, c2, c3] = atmosphereBase([theme.bg1, theme.bg2], isDark);
  const ink = (c: string) => (isDark ? c : mixHex(c, '#0B1220', 0.4));
  const speed = theme.motion === 'lively' ? 0.6 : 1;
  return (
    <View style={[styles.showcase, { backgroundColor: c1 }]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c2, opacity: 0.55 }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c3, opacity: 0.35 }]} />
      {theme.pattern === 'none' ? null : (
        <MotionScaleContext.Provider value={speed}>
          <AuroraPattern
            key={`${theme.pattern}-${theme.bg1}-${theme.bg2}`}
            kind={theme.pattern}
            color={ink(theme.bg1)}
            color2={ink(theme.bg2)}
            seed={1234}
            paused={theme.motion === 'off'}
          />
        </MotionScaleContext.Provider>
      )}
    </View>
  );
}

function Choices<T extends string>({
  value,
  onChange,
  options,
  styles,
  colors,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useThemeColors>['colors'];
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            style={[styles.choice, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : colors.bgCard }]}
          >
            <Text style={[styles.choiceText, { color: on ? colors.onAccent : colors.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sélecteur de couleur : pastilles, curseur de teinte, saisie hexadécimale. */
function ColorField({
  label,
  value,
  onChange,
  styles,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useThemeColors>['colors'];
}) {
  const [hexText, setHexText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setHexText(value);
  }
  return (
    <View style={styles.colorBox}>
      <View style={styles.colorHead}>
        <View style={[styles.colorPreview, { backgroundColor: value, borderColor: colors.border }]} />
        <Text style={styles.colorLabel}>{label}</Text>
      </View>
      <View style={styles.swatches}>
        {SWATCHES.map((c) => (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="button"
            accessibilityLabel={`Couleur ${c}`}
            style={[styles.swatch, { backgroundColor: c, borderColor: value.toUpperCase() === c ? colors.text : colors.border, borderWidth: value.toUpperCase() === c ? 3 : 1 }]}
          />
        ))}
      </View>
      <HueSlider hue={hexToHue(value)} onChange={(h) => onChange(hslToHex(h, 78, 52))} colors={colors} />
      <AppTextInput
        value={hexText}
        onChangeText={(t) => {
          setHexText(t);
          const parsed = parseHexInput(t);
          if (parsed) {
            setLastValue(parsed);
            onChange(parsed);
          }
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
        placeholder="#C026D3"
        placeholderTextColor={colors.textMuted}
        style={styles.hexInput}
      />
    </View>
  );
}

const HUE_STOPS = Array.from({ length: 13 }, (_, i) => hslToHex(i * 30, 85, 55));

function HueSlider({ hue, onChange, colors }: { hue: number; onChange: (h: number) => void; colors: ReturnType<typeof useThemeColors>['colors'] }) {
  const width = useRef(1);
  const cb = useRef(onChange);
  cb.current = onChange;
  const startX = useRef(0);
  const fromX = (x: number) => Math.round((Math.min(1, Math.max(0, x / width.current)) * 360) % 360);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          startX.current = e.nativeEvent.locationX;
          cb.current(fromX(startX.current));
        },
        onPanResponderMove: (_e, g) => cb.current(fromX(startX.current + g.dx)),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <View
      style={sliderStyles.wrap}
      onLayout={(e: LayoutChangeEvent) => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Teinte"
      accessibilityValue={{ min: 0, max: 360, now: hue }}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={sliderStyles.track}>
        {HUE_STOPS.slice(0, 12).map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      <View pointerEvents="none" style={[sliderStyles.thumb, { left: `${(hue / 360) * 100}%`, backgroundColor: hslToHex(hue, 78, 52), borderColor: colors.bgCard }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: { height: 40, justifyContent: 'center', marginTop: 10 },
  track: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  thumb: { position: 'absolute', width: 26, height: 26, borderRadius: 13, marginLeft: -13, borderWidth: 4, top: 7 },
});

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 96 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 4 },
    hint: { fontSize: 13, lineHeight: 18, color: colors.textMuted, marginTop: 4 },
    premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    premiumTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    preview: { marginTop: spacing.md, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.bgCard },
    sampleTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
    label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, marginTop: spacing.md, marginBottom: 6, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    presetCell: { width: '31%', alignItems: 'center', gap: 6 },
    presetSwatch: { width: '100%', height: 64, borderRadius: radii.lg, overflow: 'hidden' },
    presetHalf: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' },
    presetDot: { position: 'absolute', alignSelf: 'center', top: 20, left: '50%', marginLeft: -12, width: 24, height: 24, borderRadius: 12, borderWidth: 3 },
    presetLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
    showcase: { height: 170, borderRadius: radii.xl, overflow: 'hidden', marginBottom: spacing.sm },
    patternCell: { width: '23%', minWidth: 70, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: radii.lg, borderWidth: 1.5 },
    patternLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    choice: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.pill, borderWidth: 1.5 },
    choiceText: { fontSize: 14, fontWeight: '800' },
    colorBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, gap: spacing.sm },
    colorHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    colorPreview: { width: 34, height: 34, borderRadius: 17, borderWidth: 1 },
    colorLabel: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
    swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    hexInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: colors.text },
    fontRow: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5, gap: 4 },
    fontName: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
    fontSample: { fontSize: 18, color: colors.text },
  });
}
