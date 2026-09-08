import type { ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type TextInputProps,
} from 'react-native';
import { AppTextInput } from '../AppTextInput';
import { formatRaceClockInput } from '../../utils/dateInput';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../../constants/brand';
import { COVER_CROP_CENTER, coverCropImageStyle } from '../../constants/sportVisuals';
import { formatDuration, formatPace } from '../../engines/core';
import { resolvePaceZones } from '../../engines/paceZones';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { ONBOARDING_IMAGES, PLAN_PREVIEW_COPY, RELAY_COPY } from './campusIntakeConfig';

/** Barre de progression Azimut (segments jade). */
export function IntakeProgress({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  const { colors } = useThemeColors();
  const n = Math.max(total, 1);
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: Math.min(n, 8) }, (_, i) => {
        const filled = i <= Math.min(index, 7);
        return (
          <View
            key={i}
            style={[
              styles.progressSeg,
              {
                backgroundColor: filled ? BRAND.accent : colors.border,
                flex: 1,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function IntakeBackButton({ onPress }: { onPress: () => void }) {
  const { colors } = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.backBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
      accessibilityLabel="Retour"
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>‹</Text>
    </Pressable>
  );
}

export function IntakeHeader({
  title,
  subtitle,
  showBack,
  onBack,
  progressIndex,
  progressTotal,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  progressIndex: number;
  progressTotal: number;
}) {
  const { colors } = useThemeColors();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={styles.headerTop}>
        {showBack && onBack ? <IntakeBackButton onPress={onBack} /> : <View style={{ width: 40 }} />}
        <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
          <IntakeProgress index={progressIndex} total={progressTotal} />
        </View>
        <View style={{ width: 40 }} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function IntakeChoiceCard({
  title,
  subtitle,
  selected,
  onPress,
  image,
  badge,
  right,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  image?: ImageSourcePropType;
  badge?: string;
  right?: ReactNode;
}) {
  const { colors } = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.choiceCard,
        {
          backgroundColor: colors.bgElevated,
          borderColor: selected ? BRAND.accent : colors.border,
          borderWidth: selected ? 2 : 1,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      {image ? (
        <View style={styles.choiceThumbWrap}>
          <Image
            source={image}
            style={[styles.choiceThumb, coverCropImageStyle(COVER_CROP_CENTER)]}
            resizeMode="cover"
          />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.choiceTitleRow}>
          <Text style={[styles.choiceTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text style={[styles.choiceSub, { color: colors.textMuted }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? BRAND.accent : colors.borderStrong,
              backgroundColor: selected ? BRAND.accent : 'transparent',
            },
          ]}
        >
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export function IntakeField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const { colors } = useThemeColors();
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: colors.bgElevated, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <AppTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.fieldInput, { color: colors.text }]}
        {...props}
      />
    </View>
  );
}

export function IntakeGenderRow({
  value,
  onChange,
}: {
  value: 'femme' | 'homme' | null;
  onChange: (v: 'femme' | 'homme') => void;
}) {
  return (
    <View style={styles.genderRow}>
      <View style={{ flex: 1 }}>
        <IntakeChoiceCard
          title="Femme"
          selected={value === 'femme'}
          onPress={() => onChange('femme')}
        />
      </View>
      <View style={{ width: spacing.sm }} />
      <View style={{ flex: 1 }}>
        <IntakeChoiceCard
          title="Homme"
          selected={value === 'homme'}
          onPress={() => onChange('homme')}
        />
      </View>
    </View>
  );
}

/** Écran photo plein cadre — look Azimut. */
export function RelayHero({
  onStart,
  onBack,
}: {
  onStart: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.relayRoot}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={ONBOARDING_IMAGES.heroRelay}
          style={[StyleSheet.absoluteFill, coverCropImageStyle(COVER_CROP_CENTER)]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={styles.relayScrim} pointerEvents="none" />
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={[
            styles.relayBackBtn,
            { top: Math.max(insets.top, spacing.sm) + spacing.xs },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={16}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
      ) : null}
      <View style={[styles.relayContent, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.signalBlob} />
        <Text style={styles.relayHeadline}>{RELAY_COPY.headline}</Text>
        <Text style={styles.relayBody}>{RELAY_COPY.body}</Text>
        <Pressable
          style={[styles.relayCta, { marginTop: spacing.lg }]}
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel={RELAY_COPY.cta}
        >
          <Text style={styles.relayCtaText}>{RELAY_COPY.cta}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Aperçu des allures — design Azimut (pas de clone Campus). */
export function PlanPreviewCard({
  onContinue,
  recentTimeSec,
  recentDistanceKm = 5,
  weeklyKmAvg,
  level = 'intermediaire',
}: {
  onContinue: () => void;
  recentTimeSec?: number;
  recentDistanceKm?: number;
  weeklyKmAvg?: number;
  level?: 'debutant' | 'intermediaire' | 'confirme';
}) {
  const { colors } = useThemeColors();
  const zones = resolvePaceZones({
    level,
    weeklyKmAvg,
    recentDistanceKm: recentTimeSec ? recentDistanceKm : undefined,
    recentTimeSec,
  });

  const fmtRange = (b: { minSecPerKm: number; maxSecPerKm: number }) =>
    `${formatPace(b.minSecPerKm)} – ${formatPace(b.maxSecPerKm)}/km`;

  const raceLabel =
    recentTimeSec && recentTimeSec > 0
      ? `Basé sur ton ${recentDistanceKm} km en ${formatDuration(recentTimeSec)}`
      : `Estimé selon ton niveau · VMA ~${zones.vmaKmh.toFixed(1)} km/h`;

  const rows = [
    {
      key: 'easy',
      label: PLAN_PREVIEW_COPY.easy,
      value: fmtRange(zones.easy),
      hint: 'Sorties cool — tu peux parler facilement',
      accent: BRAND.accent,
    },
    {
      key: 'fast',
      label: PLAN_PREVIEW_COPY.fast,
      value: fmtRange(zones.threshold),
      hint: 'Séances seuil / qualité',
      accent: BRAND.ink,
    },
    {
      key: 'rec',
      label: PLAN_PREVIEW_COPY.recover,
      value: fmtRange(zones.recovery),
      hint: 'Jog très facile entre les répétitions',
      accent: BRAND.accentDark,
    },
  ];

  return (
    <View style={styles.planWrap}>
      <View
        style={[
          styles.azimutPreview,
          { backgroundColor: colors.bgElevated, borderColor: colors.border },
        ]}
      >
        <View style={styles.azimutPreviewTop}>
          <View style={[styles.azimutMark, { backgroundColor: BRAND.signal }]} />
          <Text style={[styles.azimutPreviewTitle, { color: colors.text }]}>
            {PLAN_PREVIEW_COPY.title}
          </Text>
        </View>
        <Text style={[styles.azimutPreviewBody, { color: colors.textMuted }]}>
          {PLAN_PREVIEW_COPY.body}
        </Text>
        <Text style={[styles.azimutRaceHint, { color: BRAND.accentDark }]}>{raceLabel}</Text>

        {rows.map((row) => (
          <View
            key={row.key}
            style={[styles.azimutPaceRow, { borderColor: colors.border }]}
          >
            <View style={[styles.azimutPaceRail, { backgroundColor: row.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.azimutPaceLabel, { color: colors.textMuted }]}>
                {row.label}
              </Text>
              <Text style={[styles.azimutPaceValue, { color: colors.text }]}>{row.value}</Text>
              <Text style={[styles.azimutPaceHint, { color: colors.textMuted }]}>{row.hint}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.planCta, { backgroundColor: BRAND.accent }]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={PLAN_PREVIEW_COPY.cta}
      >
        <Text style={[styles.planCtaText, { color: '#fff' }]}>{PLAN_PREVIEW_COPY.cta}</Text>
      </Pressable>
    </View>
  );
}

export function ReferenceRaceCard({
  duration,
  onDurationChange,
  distanceLabel = '5km',
}: {
  duration: string;
  onDurationChange: (v: string) => void;
  distanceLabel?: string;
}) {
  const { colors } = useThemeColors();
  const pace = computePaceFromDuration(duration);
  return (
    <View
      style={[
        styles.refCard,
        { backgroundColor: colors.bgElevated, borderColor: colors.border },
      ]}
    >
      <View style={styles.refHead}>
        <View style={styles.refShield}>
          <Text style={styles.refShieldText}>5K</Text>
        </View>
        <View>
          <Text style={[styles.refTitle, { color: colors.text }]}>{distanceLabel}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Temps de référence</Text>
        </View>
      </View>
      <View style={[styles.refGrid, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Durée</Text>
          <AppTextInput
            value={duration}
            onChangeText={(t) => onDurationChange(formatRaceClockInput(t))}
            placeholder="1703 → 17:03"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={[styles.refInput, { color: colors.text }]}
          />
        </View>
        <View style={[styles.refDivider, { backgroundColor: colors.border }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Allure moyenne</Text>
          <Text style={[styles.refPace, { color: colors.text }]}>
            {pace ? `${pace} /km` : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function computePaceFromDuration(raw: string): string | null {
  const parts = raw.trim().split(':').map((p) => Number(p));
  let sec = 0;
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    sec = parts[0]! * 60 + parts[1]!;
  } else if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    sec = parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  } else return null;
  if (sec <= 0) return null;
  const perKm = Math.round(sec / 5);
  const m = Math.floor(perKm / 60);
  const s = perKm % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progressSeg: { height: 4, borderRadius: 2 },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  choiceThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  choiceThumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
  },
  choiceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  choiceTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  choiceSub: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  badge: {
    backgroundColor: BRAND.signal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: BRAND.ink, fontSize: 10, fontWeight: '800' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  field: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  fieldInput: { fontSize: 16, paddingVertical: 6 },
  genderRow: { flexDirection: 'row', marginTop: spacing.sm },
  relayRoot: { flex: 1, minHeight: 560, justifyContent: 'flex-end', backgroundColor: BRAND.ink },
  relayScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,17,31,0.35)',
  },
  relayBackBtn: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 20,
    elevation: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  relayContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    zIndex: 2,
  },
  signalBlob: {
    width: 36,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND.signal,
    marginBottom: spacing.md,
    transform: [{ rotate: '-8deg' }],
  },
  relayHeadline: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  relayBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  relayCta: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  relayCtaText: { color: BRAND.ink, fontWeight: '800', fontSize: 16 },
  planWrap: { marginTop: spacing.sm },
  azimutPreview: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  azimutPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  azimutMark: {
    width: 14,
    height: 14,
    borderRadius: 4,
    transform: [{ rotate: '12deg' }],
  },
  azimutPreviewTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  azimutPreviewBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  azimutRaceHint: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  azimutPaceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  azimutPaceRail: {
    width: 4,
    borderRadius: 2,
  },
  azimutPaceLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  azimutPaceValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  azimutPaceHint: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  planCta: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  planCtaText: { fontWeight: '800', fontSize: 16 },
  refCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  refHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refShield: {
    width: 44,
    height: 48,
    borderRadius: 8,
    backgroundColor: BRAND.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refShieldText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  refTitle: { fontSize: 17, fontWeight: '700' },
  refGrid: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  refDivider: { width: 1, marginHorizontal: spacing.md },
  refInput: { fontSize: 18, fontWeight: '700', marginTop: 4, paddingVertical: 4 },
  refPace: { fontSize: 18, fontWeight: '700', marginTop: 8 },
});
