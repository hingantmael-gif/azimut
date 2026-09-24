import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import { WEEKDAY_DISPLAY_ORDER, weekdayShortLabel } from '../../constants/weekDays';
import { mixHex, radii, rgba, spacing } from '../../theme/tokens';
import { PressableScale, StaggerIn } from '../motion/softMotion';

/**
 * Kit de l'assistant « Nouveau programme » — style « verre sur photo ».
 * Tout est translucide sur le fond (photo + voile, ou aurore) ; la sélection est un
 * dégradé plein avec coche. `tone="surface"` reste disponible pour un fond clair.
 */
export type WizardTone = 'hero' | 'surface';

const GLASS = {
  bg: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.20)',
  text: '#FFFFFF',
  sub: 'rgba(255,255,255,0.72)',
  section: 'rgba(255,255,255,0.66)',
};
const LIGHT = {
  bg: '#FFFFFF',
  border: 'rgba(15,23,42,0.12)',
  text: '#0F172A',
  sub: '#64748B',
  section: '#64748B',
};

function palette(tone: WizardTone) {
  return tone === 'surface' ? LIGHT : GLASS;
}

/** Dégradé de sélection dérivé de la couleur d'accent. */
function selectedGradient(accent: string): readonly [string, string] {
  return [accent, mixHex(accent, '#22D3EE', 0.38)] as const;
}

/** Jour(s) de la semaine — pastilles hautes, sélection en dégradé. */
export function WizardDayGrid({
  selected,
  onToggle,
  accent = BRAND.accent,
  mode = 'train',
  tone = 'hero',
  enabledDays,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  accent?: string;
  mode?: 'train' | 'long';
  tone?: WizardTone;
  /** Jours cliquables (les autres sont grisés). Sert au choix de la séance longue : uniquement parmi les jours retenus. */
  enabledDays?: number[];
}) {
  const p = palette(tone);
  return (
    <View style={styles.dayGrid}>
      {WEEKDAY_DISPLAY_ORDER.map((dow, displayIndex) => {
        const label = weekdayShortLabel(dow);
        const on = mode === 'long' ? selected[0] === dow : selected.includes(dow);
        const disabled = enabledDays != null && !enabledDays.includes(dow);
        return (
          <StaggerIn key={`${mode}-${tone}-${dow}`} index={displayIndex} step={35} duration={420} style={styles.dayCell}>
            <PressableScale
              variant="pop"
              onPress={() => {
                if (!disabled) onToggle(dow);
              }}
              accessibilityLabel={`${label}${on ? ', sélectionné' : ''}${disabled ? ', indisponible' : ''}`}
              contentStyle={[
                styles.dayTile,
                disabled ? { opacity: 0.32 } : null,
                { backgroundColor: on ? 'transparent' : p.bg, borderColor: on ? accent : p.border },
              ]}
            >
              {on ? (
                <LinearGradient
                  colors={selectedGradient(accent)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.dayLabel, { color: on ? '#FFFFFF' : p.text }]}>{label}</Text>
              <View style={[styles.dayMark, on ? styles.dayMarkOn : { backgroundColor: 'transparent' }]}>
                {on ? (
                  <Ionicons name={mode === 'long' ? 'star' : 'checkmark'} size={10} color="#0B1B2B" />
                ) : null}
              </View>
            </PressableScale>
          </StaggerIn>
        );
      })}
    </View>
  );
}

/** Grande carte de choix (Oui / Non, modes, niveaux…). */
export function WizardOptionCard({
  title,
  subtitle,
  selected,
  onPress,
  accent = BRAND.accent,
  emoji,
  icon,
  index = 0,
  tone = 'hero',
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  index?: number;
  tone?: WizardTone;
}) {
  const p = palette(tone);
  return (
    <StaggerIn index={index} step={70} duration={520} style={styles.optionWrap}>
      <PressableScale
        variant="nav"
        onPress={onPress}
        accessibilityLabel={title}
        contentStyle={[
          styles.optionCard,
          { backgroundColor: selected ? 'transparent' : p.bg, borderColor: selected ? accent : p.border },
        ]}
      >
        {selected ? (
          <LinearGradient
            colors={selectedGradient(accent)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.optionInner}>
          {icon || emoji ? (
            <View style={[styles.optionIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.22)' : rgba('#FFFFFF', 0.10) }]}>
              {icon ? (
                <Ionicons name={icon} size={22} color="#FFFFFF" />
              ) : (
                <Text style={styles.optionEmoji}>{emoji}</Text>
              )}
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.optionTitle, { color: selected ? '#FFFFFF' : p.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.optionSub, { color: selected ? 'rgba(255,255,255,0.92)' : p.sub }]} numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.optionCheck, selected ? styles.optionCheckOn : { borderColor: p.border }]}>
            {selected ? <Ionicons name="checkmark" size={16} color="#0B1B2B" /> : null}
          </View>
        </View>
      </PressableScale>
    </StaggerIn>
  );
}

/** Pastilles semaines / presets. */
export function WizardPill({
  label,
  selected,
  onPress,
  index = 0,
  accent = BRAND.accent,
  tone = 'hero',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  index?: number;
  accent?: string;
  tone?: WizardTone;
}) {
  const p = palette(tone);
  return (
    <StaggerIn index={index} step={35} duration={420}>
      <PressableScale
        variant="pop"
        onPress={onPress}
        accessibilityLabel={label}
        contentStyle={[
          styles.pill,
          { backgroundColor: selected ? 'transparent' : p.bg, borderColor: selected ? accent : p.border },
        ]}
      >
        {selected ? (
          <LinearGradient
            colors={selectedGradient(accent)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Text style={[styles.pillText, { color: selected ? '#FFFFFF' : p.text }]}>{label}</Text>
      </PressableScale>
    </StaggerIn>
  );
}

/**
 * Nombre de séances par semaine : grille de grosses tuiles numérotées (4 + 3),
 * la valeur recommandée porte une étoile.
 */
export function WizardSessionGrid({
  values,
  value,
  recommended,
  onSelect,
  accent = BRAND.accent,
  tone = 'hero',
}: {
  values: number[];
  value: number;
  recommended?: number;
  onSelect: (n: number) => void;
  accent?: string;
  tone?: WizardTone;
}) {
  const p = palette(tone);
  return (
    <View style={styles.sessionGrid}>
      {values.map((n, idx) => {
        const on = value === n;
        const rec = n === recommended;
        return (
          <StaggerIn key={n} index={idx} step={40} duration={440} style={styles.sessionCell}>
            <PressableScale
              variant="pop"
              onPress={() => onSelect(n)}
              accessibilityLabel={`${n} séance${n > 1 ? 's' : ''} par semaine${rec ? ', recommandé' : ''}`}
              contentStyle={[
                styles.sessionTile,
                { backgroundColor: on ? 'transparent' : p.bg, borderColor: on ? accent : p.border },
              ]}
            >
              {on ? (
                <LinearGradient
                  colors={selectedGradient(accent)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text style={[styles.sessionNum, { color: on ? '#FFFFFF' : p.text }]}>{n}</Text>
              <Text style={[styles.sessionUnit, { color: on ? 'rgba(255,255,255,0.9)' : p.sub }]}>
                {n > 1 ? 'séances' : 'séance'}
              </Text>
              {rec ? (
                <View style={styles.recBadge}>
                  <Ionicons name="star" size={9} color="#0B1B2B" />
                </View>
              ) : null}
            </PressableScale>
          </StaggerIn>
        );
      })}
    </View>
  );
}

/** Carte de regroupement translucide (récap, aperçu, avertissements…). */
export function WizardGlassCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

/** Entrée animée du panneau d’étape — rejoue à chaque resetKey. */
export function WizardStepShell({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string | number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    opacity.setValue(0);
    y.setValue(18);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(y, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
  }, [resetKey, opacity, y]);

  return (
    <Animated.View style={{ marginTop: spacing.sm, opacity, transform: [{ translateY: y }] }}>
      {children}
    </Animated.View>
  );
}

export function WizardSectionLabel({
  children,
  tone = 'hero',
}: {
  children: string;
  /** Conservé pour compatibilité (ancien style « light »). */
  light?: boolean;
  tone?: WizardTone;
}) {
  return <Text style={[styles.sectionLabel, { color: palette(tone).section }]}>{children}</Text>;
}

/** Indication douce : pastille teintée avec icône (au lieu d'un bandeau de couleur pleine). */
export function WizardHint({
  children,
  title,
  tone = 'neutral',
  surface = 'hero',
}: {
  children: string;
  title?: string;
  tone?: 'neutral' | 'warn' | 'ok';
  surface?: WizardTone;
}) {
  const p = palette(surface);
  const color = tone === 'warn' ? '#FB7185' : tone === 'ok' ? '#34D399' : '#94A3B8';
  const icon: keyof typeof Ionicons.glyphMap =
    tone === 'warn' ? 'alert-circle' : tone === 'ok' ? 'checkmark-circle' : 'information-circle';
  return (
    <View
      style={[
        styles.hint,
        {
          backgroundColor: surface === 'surface' ? '#F1F5F9' : rgba(color, tone === 'neutral' ? 0.12 : 0.16),
          borderColor: rgba(color, tone === 'neutral' ? 0.28 : 0.42),
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        {title ? <Text style={[styles.hintTitle, { color: p.text }]}>{title}</Text> : null}
        <Text style={[styles.hintText, { color: surface === 'surface' ? '#334155' : 'rgba(255,255,255,0.86)' }]}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    marginTop: spacing.sm,
    width: '100%',
  },
  dayCell: { flex: 1, minWidth: 0 },
  dayTile: {
    borderRadius: 18,
    borderWidth: 1.5,
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 78,
    overflow: 'hidden',
  },
  dayLabel: { fontWeight: '800', fontSize: 12, letterSpacing: 0.2 },
  dayMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dayMarkOn: { backgroundColor: '#FFFFFF' },
  optionWrap: { marginBottom: 10, width: '100%', alignSelf: 'stretch' },
  optionCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 78,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: { fontSize: 24 },
  optionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  optionSub: { marginTop: 2, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  optionCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pillText: { fontWeight: '800', fontSize: 14 },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.sm,
  },
  sessionCell: { width: '22.6%' },
  sessionTile: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    overflow: 'hidden',
  },
  sessionNum: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, lineHeight: 34 },
  sessionUnit: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  recBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFC53D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    gap: 10,
  },
  hintTitle: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0.1, marginBottom: 2 },
  hintText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
});
