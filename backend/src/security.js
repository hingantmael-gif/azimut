/** Protections HTTP de l'API Mova : limitation de débit, CORS restreint, en-têtes de sécurité. */

/** Limiteur en mémoire (fenêtre glissante simple). Suffisant pour une instance ; à remplacer par Redis si on scale. */
export function createLimiter({ windowMs, max, key, message = 'Trop de tentatives. Réessayez dans quelques minutes.' }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, Math.max(windowMs, 60_000));
  timer.unref?.();
  return (req, res, next) => {
    const k = key ? key(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(k, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

const DEFAULT_ORIGINS = [
  'https://hingantmael-gif.github.io', // domaine technique actuel — remplacé par CORS_ORIGINS avec un domaine Mova
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
];

/** Origines autorisées (CORS_ORIGINS = liste séparée par des virgules). Les apps natives n'envoient pas d'Origin. */
export function corsOptions() {
  const extra = String(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ORIGINS, ...extra]);
  return {
    origin(origin, cb) {
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    maxAge: 86400,
  };
}

/** En-têtes de sécurité usuels (équivalent minimal de helmet, sans dépendance). */
export function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
    'Cache-Control': 'no-store',
  });
  res.removeHeader('X-Powered-By');
  next();
}
