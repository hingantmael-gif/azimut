/**
 * Avis publics sur Mova (site vitrine + application).
 *
 * Règles d'honnêteté : tous les avis publiés sont ceux de vraies personnes, avec la note qu'elles ont donnée
 * (1 à 5 étoiles) — on ne filtre jamais selon la note. Le propriétaire peut seulement masquer un avis abusif
 * (insultes, spam, publicité, données personnelles).
 *
 * Anti-spam : champ piège invisible, délai minimal de saisie, liens refusés, doublons refusés,
 * 3 avis / heure / IP et 1 avis / 24 h / IP (empreinte hachée, l'adresse n'est jamais stockée).
 */
import crypto from 'crypto';
import { createLimiter } from './security.js';
import { readDoc, writeDoc } from './storage.js';

const DOC = 'public_reviews';
const MAX_STORED = 3000;
const MAX_TEXT = 600;

function clean(v, max, keepNewlines = false) {
  let out = '';
  for (const ch of String(v ?? '')) {
    const c = ch.codePointAt(0);
    if (c === 10 && keepNewlines) out += ch;
    else out += c < 32 || c === 127 ? ' ' : ch;
  }
  return out.replace(/[ \t]{2,}/g, ' ').trim().slice(0, max);
}

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|fr|net|org|io|ru|xyz|shop|top|info)\b|@[a-z0-9_.]{3,})/i;
const BAD = /\b(viagra|casino|crypto|bitcoin|porn|sex[eo]|escort|prêt rapide|gagne \d+ ?€)\b/i;

function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
  return crypto.createHash('sha256').update(`mova-reviews|${ip}`).digest('hex').slice(0, 24);
}

function load() {
  const doc = readDoc(DOC, () => ({ reviews: [] }));
  return Array.isArray(doc.reviews) ? doc.reviews : [];
}

function stats(list) {
  const shown = list.filter((r) => !r.hidden);
  const count = shown.length;
  const sum = shown.reduce((t, r) => t + r.rating, 0);
  const dist = [1, 2, 3, 4, 5].map((n) => shown.filter((r) => r.rating === n).length);
  return { count, average: count ? Math.round((sum / count) * 10) / 10 : 0, distribution: dist };
}

const publicView = (r) => ({ id: r.id, name: r.name, city: r.city || '', rating: r.rating, text: r.text, sport: r.sport || '', at: r.at });

export function mountReviewRoutes(app, { authMiddleware, isOwner }) {
  const ownerOnly = (req, res, next) =>
    isOwner(req.authEmail) ? next() : res.status(403).json({ error: 'Réservé au propriétaire' });

  /** Liste publique : les plus récents d'abord. */
  app.get('/reviews', (req, res) => {
    const list = load();
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 30));
    const shown = list.filter((r) => !r.hidden).sort((a, b) => (a.at < b.at ? 1 : -1));
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ok: true, ...stats(list), reviews: shown.slice(0, limit).map(publicView) });
  });

  app.post(
    '/reviews',
    createLimiter({ windowMs: 60 * 60_000, max: 3, message: 'Trop d’avis envoyés depuis cette connexion. Réessaie plus tard.' }),
    (req, res) => {
      const b = req.body ?? {};
      // Champ piège : un humain ne le voit pas.
      if (clean(b.website, 200)) return res.json({ ok: true });
      // Délai minimal de saisie (les robots envoient tout de suite).
      const elapsed = Number(b.elapsedMs);
      if (Number.isFinite(elapsed) && elapsed < 2500) return res.status(400).json({ error: 'Prends une seconde pour relire ton avis.' });

      const rating = Math.round(Number(b.rating));
      if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Choisis une note entre 1 et 5 étoiles.' });
      const name = clean(b.name, 40);
      if (name.length < 2) return res.status(400).json({ error: 'Indique ton prénom (ou un pseudo).' });
      const text = clean(b.text, MAX_TEXT, true);
      if (text.length < 15) return res.status(400).json({ error: 'Décris ton expérience en quelques mots (15 caractères minimum).' });
      if (LINK.test(text) || LINK.test(name) || BAD.test(text)) {
        return res.status(400).json({ error: 'Les liens, adresses et messages publicitaires ne sont pas acceptés.' });
      }
      const city = clean(b.city, 40);
      if (LINK.test(city)) return res.status(400).json({ error: 'Ville invalide.' });
      const sport = ['course', 'velo', 'natation', 'triathlon', 'musculation', 'callisthenie', 'autre'].includes(b.sport) ? b.sport : '';

      const list = load();
      const who = ipHash(req);
      const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
      if (list.some((r) => r.who === who && r.at > dayAgo)) {
        return res.status(429).json({ error: 'Tu as déjà donné ton avis aujourd’hui. Merci !' });
      }
      const norm = text.toLowerCase().replace(/\s+/g, ' ');
      if (list.some((r) => r.text.toLowerCase().replace(/\s+/g, ' ') === norm)) {
        return res.status(409).json({ error: 'Cet avis existe déjà.' });
      }

      const review = { id: crypto.randomBytes(6).toString('hex'), name, city, rating, text, sport, at: new Date().toISOString(), who, hidden: false };
      list.push(review);
      writeDoc(DOC, { reviews: list.slice(-MAX_STORED) });
      res.json({ ok: true, review: publicView(review), ...stats(list) });
    },
  );

  /** Propriétaire : tous les avis (y compris masqués). */
  app.get('/admin/reviews', authMiddleware, ownerOnly, (_req, res) => {
    const list = load();
    res.json({ ok: true, ...stats(list), reviews: [...list].sort((a, b) => (a.at < b.at ? 1 : -1)).map((r) => ({ ...publicView(r), hidden: Boolean(r.hidden) })) });
  });

  /** Propriétaire : masquer / réafficher un avis abusif. */
  app.post('/admin/reviews/:id', authMiddleware, ownerOnly, (req, res) => {
    const list = load();
    const r = list.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'Avis introuvable' });
    r.hidden = req.body?.hidden === true;
    writeDoc(DOC, { reviews: list });
    res.json({ ok: true, id: r.id, hidden: r.hidden });
  });
}
