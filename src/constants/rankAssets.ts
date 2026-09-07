import type { ImageSourcePropType } from 'react-native';
import type { RankTier } from '../types/domain';
import { normalizeTier, type RankDivision } from '../engines/rankedLadder';

/** PNG transparents — symbole seul, sans libellé (générés via scripts/process-rank-frames.mjs). */
const BADGES: Record<string, ImageSourcePropType> = {
  'bronze-3': require('../../assets/ranks/badges/bronze-3.png'),
  'bronze-2': require('../../assets/ranks/badges/bronze-2.png'),
  'bronze-1': require('../../assets/ranks/badges/bronze-1.png'),
  'argent-3': require('../../assets/ranks/badges/argent-3.png'),
  'argent-2': require('../../assets/ranks/badges/argent-2.png'),
  'argent-1': require('../../assets/ranks/badges/argent-1.png'),
  'or-3': require('../../assets/ranks/badges/or-3.png'),
  'or-2': require('../../assets/ranks/badges/or-2.png'),
  'or-1': require('../../assets/ranks/badges/or-1.png'),
  'platine-3': require('../../assets/ranks/badges/platine-3.png'),
  'platine-2': require('../../assets/ranks/badges/platine-2.png'),
  'platine-1': require('../../assets/ranks/badges/platine-1.png'),
  'diamant-3': require('../../assets/ranks/badges/diamant-3.png'),
  'diamant-2': require('../../assets/ranks/badges/diamant-2.png'),
  'diamant-1': require('../../assets/ranks/badges/diamant-1.png'),
  'elite-3': require('../../assets/ranks/badges/elite-3.png'),
  'elite-2': require('../../assets/ranks/badges/elite-2.png'),
  'elite-1': require('../../assets/ranks/badges/elite-1.png'),
  champion: require('../../assets/ranks/badges/champion.png'),
};

export function rankBadgeSource(
  tier: RankTier,
  division: RankDivision | null = null,
): ImageSourcePropType {
  const id = normalizeTier(tier);
  if (id === 'champion') {
    return BADGES.champion;
  }
  const d = division ?? 3;
  return BADGES[`${id}-${d}`] ?? BADGES['bronze-3'];
}
