/**
 * Courbes de niveau procédurales (fonds de profil « topo ») — fonctions pures.
 * Chaque ligne est une onde lisse ; la déterminisme (graine) donne à chaque fond un
 * relief à lui, identique d'un affichage à l'autre.
 */

/** Graine stable à partir d'un texte (id de fond). */
export function seedFromString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 10_000;
}

export type TopoPath = {
  d: string;
  /** 0 = ligne du haut, 1 = ligne du bas. */
  t: number;
  /** Épaisseur relative (les lignes « maîtresses » sont plus marquées). */
  major: boolean;
};

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Génère `lines` courbes réparties sur la hauteur `h`, sur une largeur logique `w`
 * (débordant de `overscan` de chaque côté pour permettre une dérive sans bord visible).
 */
export function buildTopoPaths(opts: {
  seed: number;
  lines?: number;
  w?: number;
  h?: number;
  overscan?: number;
}): TopoPath[] {
  const lines = Math.max(2, Math.floor(opts.lines ?? 12));
  const w = opts.w ?? 400;
  const h = opts.h ?? 160;
  const overscan = opts.overscan ?? 30;
  const seed = opts.seed;
  const step = 20;
  const out: TopoPath[] = [];

  for (let i = 0; i < lines; i++) {
    const t = lines === 1 ? 0 : i / (lines - 1);
    const y0 = h * (0.08 + 0.84 * t);
    // Amplitude et phases dépendent de la ligne et de la graine : relief cohérent
    // (les lignes voisines se ressemblent, comme de vraies courbes de niveau).
    const amp = 6 + 9 * Math.sin(seed * 0.013 + i * 0.35) ** 2;
    const f1 = 0.011 + ((seed % 7) * 0.0008);
    const f2 = 0.023 + ((seed % 5) * 0.0011);
    const ph1 = seed * 0.017 + i * 0.28;
    const ph2 = seed * 0.031 + i * 0.6;

    const pts: [number, number][] = [];
    for (let x = -overscan; x <= w + overscan; x += step) {
      const y =
        y0 +
        amp * Math.sin(x * f1 + ph1) +
        amp * 0.45 * Math.sin(x * f2 + ph2) +
        // « Relief » commun : une bosse lente qui traverse toutes les lignes.
        10 * Math.sin(x * 0.006 + seed * 0.009 + t * 1.4);
      pts.push([x, y]);
    }

    // Courbe lisse : quadratiques entre milieux de segments.
    let d = `M ${round(pts[0]![0])} ${round(pts[0]![1])}`;
    for (let k = 1; k < pts.length - 1; k++) {
      const [x1, y1] = pts[k]!;
      const [x2, y2] = pts[k + 1]!;
      d += ` Q ${round(x1)} ${round(y1)} ${round((x1 + x2) / 2)} ${round((y1 + y2) / 2)}`;
    }
    const last = pts[pts.length - 1]!;
    d += ` T ${round(last[0])} ${round(last[1])}`;
    out.push({ d, t, major: i % 4 === 0 });
  }
  return out;
}
