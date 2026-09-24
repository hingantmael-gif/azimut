/**
 * Réglages de la communauté pilotés par le propriétaire, appliqués À TOUS immédiatement :
 * - groupMinFollowers : nombre d'abonnés requis pour créer un groupe ;
 * - verifiedMinFollowers : abonnés à partir desquels la certification est automatique ;
 * - verifiedPriceEur : prix mensuel de la certification payante (tant qu'on n'a pas assez d'abonnés).
 * Les applications relisent GET /config au démarrage, au retour au premier plan et toutes les 5 minutes.
 */
import { readDoc, writeDoc } from './storage.js';

const DOC = 'app_config';

export const DEFAULT_CONFIG = {
  groupMinFollowers: 1000,
  verifiedMinFollowers: 10000,
  verifiedPriceEur: 1,
};

export function loadConfig() {
  return { ...DEFAULT_CONFIG, ...readDoc(DOC, () => ({})) };
}

const asCount = (v, fallback, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n)) : fallback;
};

/** Abonnés acceptés d'un pseudo (base communauté). */
export function followerCount(db, username) {
  const u = String(username || '').toLowerCase();
  return db.follows.filter((f) => f.followeeUsername === u && f.status === 'accepted').length;
}

/** Certifié : assez d'abonnés, OU abonnement certification actif (champ `verified` du compte). */
export function isVerifiedAccount(db, user, cfg = loadConfig()) {
  if (!user) return false;
  if (user.verified === true) return true;
  return followerCount(db, user.username) >= cfg.verifiedMinFollowers;
}

export function mountConfigRoutes(app, { authMiddleware, isOwner }) {
  app.get('/config', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, config: loadConfig() });
  });

  app.put('/admin/config', authMiddleware, (req, res) => {
    if (!isOwner(req.authEmail)) return res.status(403).json({ error: 'Réservé au propriétaire' });
    const cur = loadConfig();
    const b = req.body ?? {};
    const next = {
      groupMinFollowers: asCount(b.groupMinFollowers, cur.groupMinFollowers, 10_000_000),
      verifiedMinFollowers: asCount(b.verifiedMinFollowers, cur.verifiedMinFollowers, 100_000_000),
      verifiedPriceEur: asCount(b.verifiedPriceEur, cur.verifiedPriceEur, 1000),
      updatedAt: new Date().toISOString(),
    };
    writeDoc(DOC, next);
    res.json({ ok: true, config: next });
  });
}
