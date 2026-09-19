import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../../constants/brand';
import {
  WEEKDAY_DISPLAY_ORDER,
  weekdayShortLabel,
} from '../../constants/weekDays';
import { radii, spacing } from '../../theme/tokens';
import { PressableScale, SoftPulse, StaggerIn } from '../motion/softMotion';

export type WizardTone = 'hero' | 'surface';

function toneStyles(tone: WizardTone) {
  if (tone === 'surface') {
    return {
      dayOffBg: '#FFFFFF',
      dayOffBorder: 'rgba(15, 23, 42, 0.12)',
      dayLabel: '#0F172A',
      dayLabelOn: '#FFFFFF',
      optionOffBg: '#FFFFFF',
      optionOffBorder: 'rgba(15, 23, 42, 0.12)',
      optionTitle: '#0F172A',
      optionTitleOn: '#FFFFFF',
      optionSub: '#64748B',
      optionSubOn: 'rgba(255,255,255,0.9)',
      checkBorder: 'rgba(15, 23, 42, 0.2)',
      pillOffBg: '#FFFFFF',
      pillOffBorder: 'rgba(15, 23, 42, 0.14)',
      pillText: '#0F172A',
      pillTextOn: '#FFFFFF',
      section: '#64748B',
      hintNeutralBg: '#F1F5F9',
      hintText: '#334155',
    };
  }
  return {
    dayOffBg: 'rgba(7, 17, 31, 0.88)',
    dayOffBorder: 'rgba(255,255,255,0.22)',
    dayLabel: 'rgba(255,255,255,0.92)',
    dayLabelOn: '#fff',
    optionOffBg: 'rgba(7, 17, 31, 0.9)',
    optionOffBorder: 'rgba(255,255,255,0.22)',
    optionTitle: '#fff',
    optionTitleOn: '#fff',
    optionSub: 'rgba(255,255,255,0.72)',
    optionSubOn: 'rgba(255,255,255,0.92)',
    checkBorder: 'rgba(255,255,255,0.4)',
    pillOffBg: 'rgba(7, 17, 31, 0.88)',
    pillOffBorder: 'rgba(255,255,255,0.24)',
    pillText: 'rgba(255,255,255,0.92)',
    pillTextOn: '#fff',
    section: 'rgba(255,255,255,0.78)',
    hintNeutralBg: 'rgba(7, 17, 31, 0.92)',
    hintText: '#FFFFFF',
  };
}

/** Grille de jours pleine largeur — sélection animée. */
export function WizardDayGrid({
  selected,
  onToggle,
  accent = BRAND.accent,
  mode = 'train',
  tone = 'hero',
}: {
  selected: number[];
  onToggle: (day: number) => void;
  accent?: string;
  mode?: 'train' | 'long';
  tone?: WizardTone;
}) {
  const t = toneStyles(tone);
  return (
    <View style={styles.dayGrid}>
      {WEEKDAY_DISPLAY_ORDER.map((dow, displayIndex) => {
        const label = weekdayShortLabel(dow);
        const on = mode === 'long' ? selected[0] === dow : selected.includes(dow);
        return (
          <StaggerIn key={`${mode}-${tone}-${dow}`} index={displayIndex} step={40} duration={480}>
            <PressableScale
              variant="pop"
              onPress={() => onToggle(dow)}
              accessibilityLabel={`${label}${on ? ', sélectionné' : ''}`}
              style={styles.dayCell}
              contentStyle={[
                styles.dayTile,
                on
                  ? { backgroundColor: accent, borderColor: accent }
                  : {
                      backgroundColor: t.dayOffBg,
                      borderColor: t.dayOffBorder,
                    },
              ]}
            >
              <SoftPulse intensity={on ? 0.05 : 0}>
                <Text
                  style={[
                    styles.dayLabel,
                    { color: on ? t.dayLabelOn : t.dayLabel },
                  ]}
                >
                  {label}
                </Text>
                {on ? <View style={styles.dayDot} /> : null}
              </SoftPulse>
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
  index = 0,
  tone = 'hero',
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  accent?: string;
  emoji?: string;
  index?: number;
  tone?: WizardTone;
}) {
  const t = toneStyles(tone);
  return (
    <StaggerIn index={index} step={70} duration={560}>
      <PressableScale
        variant="nav"
        onPress={onPress}
        accessibilityLabel={title}
        contentStyle={[
          styles.optionCard,
          selected
            ? {
                backgroundColor: accent,
                borderColor: accent,
              }
            : {
                backgroundColor: t.optionOffBg,
                borderColor: t.optionOffBorder,
              },
        ]}
        style={styles.optionWrap}
      >
        <SoftPulse intensity={selected ? 0.04 : 0}>
          <View style={styles.optionInner}>
            {emoji ? <Text style={styles.optionEmoji}>{emoji}</Text> : null}
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.optionTitle,
                  { color: selected ? t.optionTitleOn : t.optionTitle },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.optionSub,
                    { color: selected ? t.optionSubOn : t.optionSub },
                  ]}
                  numberOfLines={2}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.optionCheck,
                { borderColor: t.checkBorder },
                selected && { backgroundColor: '#fff', borderColor: '#fff' },
              ]}
            >
              {selected ? <Text style={styles.optionCheckMark}>✓</Text> : null}
            </View>
          </View>
        </SoftPulse>
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
  const t = toneStyles(tone);
  return (
    <StaggerIn index={index} step={40} duration={480}>
      <PressableScale
        variant="pop"
        onPress={onPress}
        accessibilityLabel={label}
        contentStyle={[
          styles.pill,
          selected
            ? { backgroundColor: accent, borderColor: accent }
            : {
                backgroundColor: t.pillOffBg,
                borderColor: t.pillOffBorder,
              },
        ]}
      >
        <Text
          style={[
            styles.pillText,
            { color: selected ? t.pillTextOn : t.pillText },
          ]}
        >
          {label}
        </Text>
      </PressableScale>
    </StaggerIn>
  );
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
  const y = useRef(new Animated.Value(22)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    opacity.setValue(0);
    y.setValue(22);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(y, {
        toValue: 0,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 68,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resetKey, opacity, y, scale]);

  return (
    <Animated.View
      style={{
        marginTop: spacing.sm,
        opacity,
        transform: [{ translateY: y }, { scale }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function WizardSectionLabel({
  children,
  light,
  tone = 'hero',
}: {
  children: string;
  light?: boolean;
  tone?: WizardTone;
}) {
  const t = toneStyles(tone);
  return (
    <Text
      style={[
        styles.sectionLabel,
        { color: t.section },
        light && tone === 'hero' && styles.sectionLabelLight,
      ]}
    >
      {children}
    </Text>
  );
}

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
  const t = toneStyles(surface);
  const solid =
    tone === 'warn'
      ? surface === 'surface'
        ? { bg: '#FEE2E2', fg: '#9F1239' }
        : { bg: '#BE123C', fg: '#FFFFFF' }
      : tone === 'ok'
        ? surface === 'surface'
          ? { bg: '#D1FAE5', fg: '#065F46' }
          : { bg: BRAND.accent, fg: '#FFFFFF' }
        : { bg: t.hintNeutralBg, fg: t.hintText };
  return (
    <View style={[styles.hint, { backgroundColor: solid.bg }]}>
      {title ? (
        <Text style={[styles.hintTitle, { color: solid.fg }]}>{title}</Text>
      ) : null}
      <Text style={[styles.hintText, { color: solid.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 6,
    marginTop: spacing.sm,
    width: '100%',
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
  },
  dayTile: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
  },
  dayLabel: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  dayDot: {
    marginTop: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  optionWrap: { marginBottom: 8, width: '100%', alignSelf: 'stretch' },
  optionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 72,
    justifyContent: 'center',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionEmoji: { fontSize: 26 },
  optionTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  optionSub: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  optionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckMark: {
    color: BRAND.accent,
    fontWeight: '900',
    fontSize: 14,
  },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 14,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionLabelLight: { color: 'rgba(255,255,255,0.78)' },
  hint: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
});
