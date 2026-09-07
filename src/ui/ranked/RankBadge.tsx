import { Image, Platform, View, type ViewStyle } from 'react-native';
import type { RankTier } from '../../types/domain';
import { normalizeTier, type RankDivision } from '../../engines/rankedLadder';
import { rankBadgeSource } from '../../constants/rankAssets';

type Props = {
  tier: RankTier;
  division?: RankDivision | null;
  size?: number;
  style?: ViewStyle;
  /** Alias conservé — plus de halo / anneau */
  compact?: boolean;
  /** @deprecated Les logos incluent déjà la division visuellement */
  showDivision?: boolean;
};

const TIER_ORDER: RankTier[] = [
  'bronze',
  'argent',
  'or',
  'diamant',
  'platine',
  'elite',
  'champion',
];

/** 0 (Bronze 3) → 24 (Champion) */
export function rankVisualLevel(
  tier: RankTier,
  division: RankDivision | null = null,
): number {
  const id = normalizeTier(tier);
  const tierIdx = Math.max(0, TIER_ORDER.indexOf(id));
  const divBonus = division == null ? 3 : 4 - division;
  return tierIdx * 3 + divBonus;
}

export function rimColors(tier: RankTier) {
  switch (normalizeTier(tier)) {
    case 'bronze':
      return { hi: '#E8B07A', mid: '#CD7F32', lo: '#8B4513' };
    case 'argent':
      return { hi: '#F8FAFC', mid: '#C0C0C0', lo: '#64748B' };
    case 'or':
      return { hi: '#FEF08A', mid: '#FFD700', lo: '#B8860B' };
    case 'diamant':
      return { hi: '#93C5FD', mid: '#2563EB', lo: '#1E3A8A' };
    case 'platine':
      return { hi: '#5EEAD4', mid: '#0E8F6F', lo: '#0A6B54' };
    case 'elite':
      return { hi: '#DDD6FE', mid: '#7C3AED', lo: '#5B21B6' };
    case 'champion':
      return { hi: '#D4FF3F', mid: '#FFD700', lo: '#0E8F6F' };
    default:
      return { hi: '#FFD700', mid: '#EF4444', lo: '#991B1B' };
  }
}

/**
 * Badge rang : logo seul, fond transparent, sans cercle / carré / anneau animé.
 */
export function RankBadge({
  tier,
  division = null,
  size = 64,
  style,
}: Props) {
  const id = normalizeTier(tier);
  const source = rankBadgeSource(id, division);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          overflow: 'visible',
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          backgroundColor: 'transparent',
          ...(Platform.OS === 'android' ? { tintColor: undefined } : null),
        }}
        resizeMode="contain"
        accessibilityLabel={`Rang ${id}${division != null ? ` ${division}` : ''}`}
      />
    </View>
  );
}
