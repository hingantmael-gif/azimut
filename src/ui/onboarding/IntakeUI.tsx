import type { ReactNode } from 'react';
import {
  Image,
  ImageBackground,
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

/** Aperçu plan — graph barres Azimut. */
export function PlanPreviewCard({ onContinue }: { onContinue: () => void }) {
  const { colors } = useThemeColors();
  return (
    <View style={styles.planWrap}>
      <ImageBackground
        source={ONBOARDING_IMAGES.planTeaser}
        style={styles.planHero}
        imageStyle={[{ borderRadius: radii.lg }, coverCropImageStyle(COVER_CROP_CENTER)]}
        resizeMode="cover"
      >
        <View style={styles.planScrim} />
        <Text style={styles.planTitle}>{PLAN_PREVIEW_COPY.title}</Text>
        <Text style={styles.planBody}>{PLAN_PREVIEW_COPY.body}</Text>

        <View style={styles.bars}>
          <View style={[styles.bar, { height: 28, width: 72, backgroundColor: BRAND.signal }]} />
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.barPair}>
              <View style={[styles.bar, { height: 56, width: 14, backgroundColor: BRAND.accent }]} />
              <View
                style={[
                  styles.bar,
                  { height: 22, width: 14, backgroundColor: 'rgba(61,255,154,0.55)' },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={[styles.paceCard, { backgroundColor: 'rgba(7,17,31,0.82)' }]}>
          <View style={[styles.paceAccent, { backgroundColor: BRAND.signal }]} />
          <View>
            <Text style={styles.paceLabel}>{PLAN_PREVIEW_COPY.easy}</Text>
            <Text style={styles.paceValue}>{PLAN_PREVIEW_COPY.easyDetail}</Text>
          </View>
        </View>
        <View style={[styles.paceCard, { backgroundColor: 'rgba(7,17,31,0.82)', marginTop: 8 }]}>
          <View style={styles.paceAccentStack}>
            <View style={[styles.paceAccent, { backgroundColor: BRAND.accent, height: 18 }]} />
            <View style={[styles.paceAccent, { backgroundColor: BRAND.signalMint, height: 18 }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.paceLabel}>{PLAN_PREVIEW_COPY.fast}</Text>
            <Text style={styles.paceValue}>{PLAN_PREVIEW_COPY.fastDetail}</Text>
            <Text style={[styles.paceLabel, { marginTop: 6 }]}>{PLAN_PREVIEW_COPY.slow}</Text>
            <Text style={styles.paceValue}>{PLAN_PREVIEW_COPY.slowDetail}</Text>
          </View>
          <View style={styles.repeatBadge}>
            <Text style={styles.repeatText}>↻ 5</Text>
          </View>
        </View>
      </ImageBackground>

      <Pressable
        style={[styles.planCta, { backgroundColor: colors.text }]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={PLAN_PREVIEW_COPY.cta}
      >
        <Text style={[styles.planCtaText, { color: colors.bg }]}>{PLAN_PREVIEW_COPY.cta}</Text>
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
  planHero: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    padding: spacing.lg,
    minHeight: 360,
    justifyContent: 'flex-end',
  },
  planScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,17,31,0.45)',
  },
  planTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  planBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: spacing.md,
  },
  bar: { borderRadius: 4 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 10,
  },
  paceAccent: { width: 3, borderRadius: 2, alignSelf: 'stretch' },
  paceAccentStack: { gap: 4 },
  paceLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  paceValue: { color: '#fff', fontWeight: '700', fontSize: 14 },
  repeatBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  repeatText: { color: '#fff', fontWeight: '700' },
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
