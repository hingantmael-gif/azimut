/**
 * Messagerie de contact intégrée à l'app : les questions arrivent dans la boîte du compte propriétaire
 * (Paramètres → Messages). Aucune adresse e-mail publique n'est exposée.
 *
 * Anti-spam (petite procédure, sans friction pour un vrai utilisateur) :
 *  - nom + prénom obligatoires, e-mail valide si la personne n'est pas connectée ;
 *  - question de vérification simple, signée par le serveur (expire en 15 min, à usage unique) ;
 *  - champ piège invisible + délai minimal de saisie ;
 *  - limites : 5 messages / heure / IP, 3 messages / 24 h / expéditeur, doublons refusés.
 */
import crypto from 'crypto';
import { createLimiter } from './security.js';
import { readDoc, writeDoc } from './storage.js';

const DOC = 'contact_messages';
const MAX_STORED = 2000;
const CATEGORIES = ['question', 'bug', 'compte', 'donnees', 'autre'];
const usedChallenges = new Map(); // nonce -> expiration

function sign(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex').slice(0, 32);
}

/** Supprime les caractères de contrôle (sauf saut de ligne si demandé) et borne la longueur. */
function clean(v, max, keepNewlines = false) {
  let out = '';
  for (const ch of String(v ?? '')) {
    const c = ch.codePointAt(0);
    if (c === 10 && keepNewlines) out += ch;
    else out += c < 32 || c === 127 ? ' ' : ch;
  }
  return out.trim().slice(0, max);
}

export function mountContactRoutes(
  app,
  { authMiddleware, verifyAuthToken, authSecret, loadUsers, normalizeEmail, isValidEmail, isOwner },
) {
  const ownerOnly = (req, res, next) =>
    isOwner(req.authEmail) ? next() : res.status(403).json({ error: 'Réservé au propriétaire' });

  app.get('/contact/challenge', (_req, res) => {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const exp = Date.now() + 15 * 60_000;
    const nonce = crypto.randomBytes(6).toString('hex');
    const token = `${exp}.${nonce}.${sign(authSecret(), `${a + b}|${exp}|${nonce}`)}`;
    res.json({ question: `${a} + ${b} = ?`, token });
  });

  app.post(
    '/contact',
    createLimiter({ windowMs: 60 * 60_000, max: 5, message: 'Trop de messages envoyés. Réessaie dans une heure.' }),
    (req, res) => {
      const b = req.body ?? {};

      // Champ piège : un humain ne le voit pas. On répond « ok » sans rien enregistrer.
      if (clean(b.website, 200)) return res.json({ ok: true });

      // Identité : compte connecté si le jeton est valide, sinon visiteur.
      const header = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const payload = header ? verifyAuthToken(header) : null;
      const account = payload
        ? loadUsers().find((u) => normalizeEmail(u.email) === normalizeEmail(payload.email))
        : null;

      const firstName = clean(b.firstName, 60) || clean(account?.firstName, 60);
      const lastName = clean(b.lastName, 60) || clean(account?.lastName, 60);
      const email = account ? normalizeEmail(account.email) : normalizeEmail(b.email);
      const message = clean(b.message, 2000, true);
      const category = CATEGORIES.includes(b.category) ? b.category : 'question';

      if (firstName.length < 2 || lastName.length < 2) {
        return res.status(400).json({ error: 'Indique ton prénom et ton nom.' });
      }
      if (!account && !isValidEmail(email)) {
        return res.status(400).json({ error: 'Indique une adresse e-mail valide pour que nous puissions te répondre.' });
      }
      if (message.length < 15) {
        return res.status(400).json({ error: 'Ton message est trop court : explique ta demande en quelques phrases.' });
      }
      if ((message.match(/https?:\/\//gi) ?? []).length > 1) {
        return res.status(400).json({ error: 'Trop de liens dans le message.' });
      }

      if (!account) {
        // Vérification humaine : question signée, valable 15 min, à usage unique.
        const parts = String(b.challengeToken ?? '').split('.');
        const [exp, nonce, sig] = parts;
        const expected = sign(authSecret(), `${Number(String(b.challengeAnswer ?? '').trim())}|${exp}|${nonce}`);
        const valid =
          parts.length === 3 &&
          Number(exp) > Date.now() &&
          !usedChallenges.has(nonce) &&
          sig.length === expected.length &&
          crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
        if (!valid) {
          return res.status(400).json({ error: 'Vérification incorrecte ou expirée : réessaie.', refresh: true });
        }
        usedChallenges.set(nonce, Number(exp));
        for (const [k, v] of usedChallenges) if (v < Date.now()) usedChallenges.delete(k);
      }

      // Formulaire rempli trop vite : script.
      if (!(Number(b.elapsedMs) >= 3000)) {
        return res.status(400).json({ error: 'Envoi trop rapide — relis ton message puis réessaie.' });
      }

      const all = readDoc(DOC, () => []);
      const dayAgo = Date.now() - 24 * 3600_000;
      const mine = all.filter((m) => m.email === email && Date.parse(m.createdAt) > dayAgo);
      if (mine.length >= 3) {
        return res
          .status(429)
          .json({ error: 'Tu as déjà envoyé plusieurs messages aujourd’hui. Nous te répondons dès que possible.' });
      }
      if (mine.some((m) => m.message === message)) {
        return res.status(409).json({ error: 'Ce message a déjà été envoyé.' });
      }

      const entry = {
        id: crypto.randomBytes(8).toString('hex'),
        createdAt: new Date().toISOString(),
        firstName,
        lastName,
        email,
        category,
        message,
        fromAccount: Boolean(account),
        read: false,
      };
      writeDoc(DOC, [entry, ...all].slice(0, MAX_STORED));
      res.json({ ok: true });
    },
  );

  // ——— Boîte de réception du propriétaire ———
  app.get('/admin/messages', authMiddleware, ownerOnly, (_req, res) => {
    const messages = readDoc(DOC, () => []);
    res.json({ ok: true, messages, unread: messages.filter((m) => !m.read).length });
  });

  app.patch('/admin/messages/:id', authMiddleware, ownerOnly, (req, res) => {
    const all = readDoc(DOC, () => []);
    const m = all.find((x) => x.id === req.params.id);
    if (!m) return res.status(404).json({ error: 'Message introuvable' });
    m.read = req.body?.read !== false;
    writeDoc(DOC, all);
    res.json({ ok: true });
  });

  app.delete('/admin/messages/:id', authMiddleware, ownerOnly, (req, res) => {
    const all = readDoc(DOC, () => []);
    writeDoc(
      DOC,
      all.filter((x) => x.id !== req.params.id),
    );
    res.json({ ok: true });
  });
}
