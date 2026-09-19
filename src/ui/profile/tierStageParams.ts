/**
 * Paramètres de la « scène » des fonds de rang (fonction pure, testable hors React Native).
 * `level` : 1 = Bronze … 7 = Champion. Plus le palier monte, plus la scène est riche et vive.
 */
export type TierStageParams = {
  rays: number;
  rayOpacity: number;
  rayRotateMs: number;
  rings: number;
  ringMs: number;
  orbiters: number;
  orbitMs: number;
};

export function tierStageParams(level: number, compact: boolean): TierStageParams {
  const l = Number.isFinite(level) ? Math.max(1, Math.min(7, Math.round(level))) : 1;
  return {
    rays: compact ? 8 : 6 + l * 2,
    rayOpacity: 0.17 + l * 0.05,
    rayRotateMs: Math.round(30000 - l * 3000),
    rings: compact ? 1 : l >= 5 ? 3 : l >= 3 ? 2 : 1,
    ringMs: Math.round(3600 - l * 260),
    orbiters: compact ? 4 : 4 + l,
    orbitMs: Math.round(9000 - l * 800),
  };
}
