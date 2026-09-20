import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mountCommunityRoutes } from './community.js';
import { mountBillingRoutes } from './billing.js';
import { purgeUserCommunity } from './community.js';
import { deleteDoc, flushStorage, initStorage, readDoc, storageMode, userDocName, writeDoc } from './storage.js';
import { corsOptions, createLimiter, securityHeaders } from './security.js';

/** Charge backend/.env si présent (sans dépendance dotenv) */
function loadEnvFile() {
  try {
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}
loadEnvFile();

/**
 * API Mova — auth Google + OTP e-mail (6 chiffres)
 * Env :
 *   RESEND_API_KEY (+ EMAIL_FROM)  → envoi réel du code
 *   BREVO_API_KEY (+ EMAIL_FROM)   → alternative
 *   AUTH_ALLOW_DEMO_CODE=true      → renvoie demoCode si pas d’e-mail configuré (dev only)
 *   GOOGLE_CLIENT_ID               → audience OAuth (optionnel côté vérif)
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(corsOptions()));
// La synchronisation envoie l'état complet de l'app : limite plus large, uniquement sur /sync.
app.use('/sync', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '1mb' }));

// Limitation de débit : force brute sur les codes et mots de passe, inscriptions en masse.
const emailKey = (req) => `${req.ip}|${String(req.body?.email ?? req.body?.emailOrUsername ?? '').toLowerCase()}`;
app.use('/auth', createLimiter({ windowMs: 10 * 60_000, max: 60 }));
app.use(
  ['/auth/login', '/auth/verify-2fa', '/auth/complete-profile'],
  createLimiter({ windowMs: 10 * 60_000, max: 12, key: emailKey }),
);
app.use(
  ['/auth/request-otp', '/auth/register', '/auth/resend-2fa', '/auth/signup'],
  createLimiter({ windowMs: 60 * 60_000, max: 8, key: emailKey, message: 'Trop de demandes. Réessayez dans une heure.' }),
);

const otps = new Map(); // email -> { hash, expiresAt, attempts }
const workouts = [];
const activities = [];
const healthEvents = [];

function loadUsers() {
  return readDoc('users', () => []);
}

function saveUsers(users) {
  writeDoc('users', users);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const next = crypto.scryptSync(password, salt, 64).toString('hex');
  if (hash.length !== next.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
  } catch {
    return false;
  }
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Durée de vie d'un jeton de session. */
const TOKEN_TTL_MS = 30 * 24 * 3600_000;
/** Anciens jetons (sans expiration) : acceptés encore 90 jours après émission puis refusés. */
const LEGACY_TOKEN_MAX_AGE_MS = 90 * 24 * 3600_000;

function authSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET (16 caractères minimum) est obligatoire en production');
  }
  return 'azimut-dev-secret';
}

function signPayload(payloadB64) {
  return crypto.createHmac('sha256', authSecret()).update(payloadB64).digest('base64url');
}

function issueToken(email) {
  const user = loadUsers().find((u) => String(u.email ?? '').toLowerCase() === String(email).toLowerCase());
  const iat = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ email, iat, exp: iat + TOKEN_TTL_MS, tv: user?.tokenVersion ?? 0 }),
    'utf8',
  ).toString('base64url');
  return `az_${payload}.${signPayload(payload)}`;
}

/** Le code de démonstration n'est JAMAIS renvoyé en production. */
function demoCodesAllowed() {
  return process.env.NODE_ENV !== 'production' && process.env.AUTH_ALLOW_DEMO_CODE !== 'false';
}

async function sendOtpEmail(to, code) {
  const from = process.env.EMAIL_FROM || 'Mova <onboarding@resend.dev>';
  const subject = 'Votre code Mova';
  const html = `<p>Votre code de vérification Mova :</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
    <p>Valable 10 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>`;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend: ${res.status} ${body}`);
    }
    return { sent: true, provider: 'resend' };
  }

  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: from.includes('<') ? from.replace(/.*<([^>]+)>.*/, '$1') : from, name: 'Mova' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo: ${res.status} ${body}`);
    }
    return { sent: true, provider: 'brevo' };
  }

  console.log(`[mova-auth] OTP ${to} → ${code} (aucun fournisseur e-mail configuré)`);
  return { sent: false, provider: 'console' };
}

function storeOtp(email, code) {
  otps.set(email.toLowerCase(), {
    hash: hashOtp(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
}

const TRIAL_LOGIN_ID = '1';
const TRIAL_EMAIL = '1@demo.local';
/** Compte d'essai local : jamais actif en production (ALLOW_TRIAL_ACCOUNT=true pour le développement). */
const TRIAL_ENABLED = process.env.ALLOW_TRIAL_ACCOUNT === 'true';

/** Compte propriétaire : Premium gratuit, Google uniquement. */
const OWNER_PREMIUM_EMAIL = 'hingant.mael@gmail.com';
const OWNER_GOOGLE_ONLY_MESSAGE =
  'Ce compte ultra-sécurisé doit se connecter uniquement avec Google.';

function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
    .replace(/\uFF20/g, '@')
    .replace(/\s+/g, '');
}

function isOwnerPremiumEmail(email) {
  return normalizeEmail(email) === OWNER_PREMIUM_EMAIL;
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  if (!e || e.length > 254) return false;
  const at = e.indexOf('@');
  if (at < 1 || at !== e.lastIndexOf('@')) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!local || !domain || /\s/.test(local) || /\s/.test(domain)) return false;
  return domain.includes('.') ? /\.[^\s@.]{2,}$/.test(domain) : domain.length >= 2;
}

function isTrialLogin(id, password) {
  const normalized = String(id ?? '').trim().toLowerCase();
  return (
    TRIAL_ENABLED &&
    String(password ?? '') === '1' &&
    (normalized === TRIAL_LOGIN_ID || normalized === TRIAL_EMAIL)
  );
}

function ensureTrialUser(users) {
  let user = users.find(
    (u) => u.email === TRIAL_EMAIL || u.username === TRIAL_LOGIN_ID,
  );
  if (!user) {
    user = {
      id: 'demo-1',
      email: TRIAL_EMAIL,
      username: TRIAL_LOGIN_ID,
      firstName: '1',
      lastName: '1',
      emailVerified: true,
      passwordHash: hashPassword('1'),
      provider: 'trial',
      createdAt: new Date().toISOString(),
    };
    users.push(user);
  } else {
    user.emailVerified = true;
    user.passwordHash = hashPassword('1');
    user.username = TRIAL_LOGIN_ID;
    user.firstName = user.firstName ?? '1';
    user.lastName = user.lastName ?? '1';
  }
  return user;
}

/** Politique alignée app : majuscule, minuscule, chiffre, spécial (longueur libre). */
function validatePasswordPolicy(password) {
  const pwd = String(password ?? '');
  if (!/[a-z]/.test(pwd)) return 'Le mot de passe doit contenir une minuscule.';
  if (!/[A-Z]/.test(pwd)) return 'Le mot de passe doit contenir une majuscule.';
  if (!/\d/.test(pwd)) return 'Le mot de passe doit contenir un chiffre.';
  if (!/[!@#$%^&*()_+\-=[\]{}|;:'",.<>/?\\`~]/.test(pwd)) {
    return 'Le mot de passe doit contenir un caractère spécial (. , - _ ! …).';
  }
  return null;
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'mova-api',
    mailConfigured: Boolean(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY),
    storage: storageMode(),
  });
});

async function handleRequestOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      error: 'E-mail invalide — ex. toi@gmail.com, toi@outlook.com, toi@orange.fr',
    });
  }
  if (isOwnerPremiumEmail(email)) {
    return res.status(403).json({ error: OWNER_GOOGLE_ONLY_MESSAGE });
  }
  // Compte essai réservé + comptes déjà finalisés → pas de nouvelle inscription
  if (email === TRIAL_LOGIN_ID || email === TRIAL_EMAIL) {
    return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
  }
  const existing = loadUsers().find((u) => String(u.email ?? '').toLowerCase() === email);
  if (existing && existing.passwordHash) {
    return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
  }
  const code = genCode();
  storeOtp(email, code);
  try {
    const mail = await sendOtpEmail(email, code);
    const allowDemo = demoCodesAllowed();
    res.json({
      ok: true,
      email,
      mailSent: mail.sent,
      ...(allowDemo && !mail.sent ? { demoCode: code } : {}),
      message: mail.sent
        ? 'Code envoyé par e-mail'
        : 'Fournisseur e-mail non configuré (RESEND_API_KEY ou BREVO_API_KEY)',
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Impossible d’envoyer l’e-mail. Réessayez plus tard.' });
  }
}

/** Demande / renvoi code OTP e-mail */
app.post('/auth/request-otp', handleRequestOtp);
app.post('/auth/register', handleRequestOtp);

app.post('/auth/resend-2fa', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  if (!email) return res.status(400).json({ error: 'email requis' });
  const code = genCode();
  storeOtp(email, code);
  try {
    const mail = await sendOtpEmail(email, code);
    const allowDemo = demoCodesAllowed();
    res.json({
      ok: true,
      mailSent: mail.sent,
      ...(allowDemo && !mail.sent ? { demoCode: code } : {}),
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Envoi impossible' });
  }
});

app.post('/auth/verify-2fa', (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const code = String(req.body?.code ?? '').trim();
  const entry = otps.get(email);
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Code invalide ou expiré' });
  }
  entry.attempts += 1;
  if (entry.attempts > 8) {
    otps.delete(email);
    return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
  }
  if (entry.hash !== hashOtp(code)) {
    return res.status(401).json({ error: 'Code incorrect' });
  }
  otps.delete(email);
  const users = loadUsers();
  let user = users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: `u_${Date.now()}`,
      email,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      provider: 'email',
    };
    users.push(user);
    saveUsers(users);
  } else {
    user.emailVerified = true;
    saveUsers(users);
  }
  res.json({
    ok: true,
    token: issueToken(email),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      username: user.username ?? '',
      emailVerified: true,
    },
  });
});

/** Inscription directe (e-mail + mot de passe) — sans OTP */
app.post('/auth/signup', (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { firstName, lastName, username, password } = req.body ?? {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      error: 'E-mail invalide — ex. toi@gmail.com, toi@outlook.com, toi@orange.fr',
    });
  }
  if (isOwnerPremiumEmail(email)) {
    return res.status(403).json({ error: OWNER_GOOGLE_ONLY_MESSAGE });
  }
  if (email === TRIAL_LOGIN_ID || email === TRIAL_EMAIL) {
    return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
  }
  const pwdError = validatePasswordPolicy(password);
  if (pwdError) return res.status(400).json({ error: pwdError });
  const handle = String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  if (!handle || handle.length < 3) {
    return res.status(400).json({ error: 'Identifiant invalide (3 caractères minimum).' });
  }
  if (handle === TRIAL_LOGIN_ID) {
    return res.status(409).json({ error: 'Cet identifiant est déjà utilisé.' });
  }
  const users = loadUsers();
  if (users.some((u) => String(u.email ?? '').toLowerCase() === email && u.passwordHash)) {
    return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
  }
  if (
    users.some(
      (u) =>
        String(u.username ?? '').toLowerCase() === handle &&
        String(u.email ?? '').toLowerCase() !== email,
    )
  ) {
    return res.status(409).json({ error: 'Cet identifiant est déjà utilisé.' });
  }
  let user = users.find((u) => String(u.email ?? '').toLowerCase() === email);
  if (!user) {
    user = {
      id: `u_${Date.now()}`,
      email,
      createdAt: new Date().toISOString(),
      provider: 'email',
    };
    users.push(user);
  }
  user.emailVerified = true;
  user.firstName = String(firstName ?? '').trim();
  user.lastName = String(lastName ?? '').trim();
  user.username = handle;
  user.passwordHash = hashPassword(String(password));
  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  res.json({
    ok: true,
    token: issueToken(email),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      emailVerified: true,
    },
  });
});

/** Finalise profil + mot de passe après OTP */
app.post('/auth/complete-profile', (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const { firstName, lastName, username, password } = req.body ?? {};
  const pwdError = validatePasswordPolicy(password);
  if (!email || !password || pwdError) {
    return res.status(400).json({ error: pwdError || 'E-mail et mot de passe requis' });
  }
  const handle = String(username ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  if (!handle || handle.length < 3) {
    return res.status(400).json({ error: 'Identifiant invalide (3 caractères minimum).' });
  }
  if (handle === TRIAL_LOGIN_ID || email === TRIAL_EMAIL || email === TRIAL_LOGIN_ID) {
    return res.status(409).json({ error: 'Cet identifiant est déjà utilisé.' });
  }
  if (isOwnerPremiumEmail(email)) {
    return res.status(403).json({ error: OWNER_GOOGLE_ONLY_MESSAGE });
  }
  const users = loadUsers();
  let user = users.find((u) => u.email === email);
  if (!user || !user.emailVerified) {
    return res.status(403).json({ error: 'E-mail non vérifié' });
  }
  const usernameTaken = users.some(
    (u) =>
      String(u.username ?? '').toLowerCase() === handle &&
      String(u.email ?? '').toLowerCase() !== email,
  );
  if (usernameTaken) {
    return res.status(409).json({ error: 'Cet identifiant est déjà utilisé.' });
  }
  user.firstName = String(firstName ?? '').trim();
  user.lastName = String(lastName ?? '').trim();
  user.username = handle;
  user.passwordHash = hashPassword(String(password));
  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  res.json({
    ok: true,
    token: issueToken(email),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      emailVerified: true,
    },
  });
});

app.post('/auth/login', (req, res) => {
  const id = String(req.body?.emailOrUsername ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!id || !password) {
    return res.status(400).json({ error: 'Identifiants requis' });
  }
  if (isTrialLogin(id, password)) {
    const users = loadUsers();
    const user = ensureTrialUser(users);
    saveUsers(users);
    return res.json({
      ok: true,
      token: issueToken(user.email),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        username: user.username ?? '',
        emailVerified: true,
      },
    });
  }
  if (isOwnerPremiumEmail(id)) {
    return res.status(403).json({ error: OWNER_GOOGLE_ONLY_MESSAGE });
  }
  const users = loadUsers();
  const user = users.find((u) => u.email === id || u.username === id);
  if (user && isOwnerPremiumEmail(user.email)) {
    return res.status(403).json({ error: OWNER_GOOGLE_ONLY_MESSAGE });
  }
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect' });
  }
  res.json({
    ok: true,
    token: issueToken(user.email),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      username: user.username ?? '',
      emailVerified: Boolean(user.emailVerified),
    },
  });
});

/** Suppression compte essai — ne pas exposer d’indice d’inscription */
app.post('/auth/delete-trial', (req, res) => {
  const id = String(req.body?.emailOrUsername ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!isTrialLogin(id, password)) {
    return res.status(400).json({ error: 'Identifiants essai invalides' });
  }
  const users = loadUsers().filter(
    (u) => u.email !== TRIAL_EMAIL && u.username !== TRIAL_LOGIN_ID,
  );
  saveUsers(users);
  res.json({ ok: true });
});

/**
 * Connexion Google — le client envoie accessToken obtenu via OAuth.
 * On récupère le profil chez Google (e-mail déjà vérifié par Google).
 */
app.post('/auth/google', async (req, res) => {
  const accessToken = String(req.body?.accessToken ?? '').trim();
  if (!accessToken) {
    return res.status(400).json({ error: 'accessToken Google requis' });
  }
  try {
    const gRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!gRes.ok) {
      return res.status(401).json({ error: 'Jeton Google invalide' });
    }
    const g = await gRes.json();
    const email = String(g.email ?? '')
      .trim()
      .toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'E-mail Google introuvable' });
    }
    if (g.verified_email === false) {
      return res.status(403).json({ error: 'E-mail Google non vérifié' });
    }
    const users = loadUsers();
    let user = users.find((u) => u.email === email);
    const isNew = !user;
    if (!user) {
      const base = String(g.given_name || email.split('@')[0] || 'athlete')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 16);
      let username = base || `user${Date.now().toString(36)}`;
      let n = 0;
      while (users.some((u) => u.username === username)) {
        n += 1;
        username = `${base}${n}`.slice(0, 20);
      }
      user = {
        id: `g_${g.id || Date.now()}`,
        email,
        firstName: g.given_name || '',
        lastName: g.family_name || '',
        username,
        emailVerified: true,
        provider: 'google',
        googleId: g.id,
        createdAt: new Date().toISOString(),
      };
      users.push(user);
    } else {
      user.provider = 'google';
      user.googleId = g.id || user.googleId;
      user.emailVerified = true;
      if (!user.firstName && g.given_name) user.firstName = g.given_name;
      if (!user.lastName && g.family_name) user.lastName = g.family_name;
      user.updatedAt = new Date().toISOString();
    }
    if (isOwnerPremiumEmail(email)) {
      user.plan = 'premium_yearly';
      user.provider = 'google';
    }
    saveUsers(users);
    res.json({
      ok: true,
      isNew,
      token: issueToken(email),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        username: user.username ?? '',
        emailVerified: true,
        plan: user.plan || 'free',
        provider: 'google',
      },
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'Vérification Google impossible' });
  }
});

// ─── Auth token (Mova) ───────────────────────────────────────────────────

function verifyAuthToken(token) {
  if (!token?.startsWith('az_')) return null;
  const raw = token.slice(3);
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(signPayload(payloadB64));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.email) return null;
    const exp = payload.exp ?? (payload.iat ?? 0) + LEGACY_TOKEN_MAX_AGE_MS;
    if (Date.now() > exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const payload = verifyAuthToken(token);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  // Le compte doit exister (supprimé = jeton mort) et la version du jeton doit être à jour (déconnexion partout).
  const user = loadUsers().find((u) => String(u.email ?? '').toLowerCase() === String(payload.email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Compte introuvable' });
  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    return res.status(401).json({ error: 'Session expirée — reconnecte-toi' });
  }
  req.authEmail = payload.email;
  next();
}

function findAuthedUser(email) {
  const users = loadUsers();
  const user = users.find((u) => u.email === email);
  return { users, user };
}

const INTEGRATION_PROVIDERS = ['garmin', 'apple_health', 'health_connect'];

function integrationStatusForClient(user) {
  const stored = user.oauthIntegrations || {};
  return INTEGRATION_PROVIDERS.map((provider) => {
    const hit = stored[provider];
    return {
      provider,
      connected: Boolean(hit?.accessToken),
      lastSyncAt: hit?.connectedAt,
      accountLabel: hit?.displayName,
    };
  });
}

async function exchangeGarminTokens({ code, codeVerifier, redirectUri }) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Garmin API non configurée (GARMIN_CLIENT_ID / GARMIN_CLIENT_SECRET)');
  }
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
  });
  if (redirectUri) params.set('redirect_uri', redirectUri);
  const res = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error_description || body.error || `Garmin token ${res.status}`);
  }
  return body;
}

async function refreshGarminTokens(refreshToken) {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error_description || body.error || `Garmin refresh ${res.status}`);
  }
  return body;
}

async function garminUserId(accessToken) {
  const res = await fetch('https://apis.garmin.com/wellness-api/rest/user/id', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body.userId ?? body.user_id ?? null;
}

async function exchangeStravaTokens({ code, redirectUri }) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Strava API non configurée (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET)');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });
  if (redirectUri) params.set('redirect_uri', redirectUri);
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || body.error || `Strava token ${res.status}`);
  }
  return body;
}

async function garminAccessTokenForUser(user) {
  const g = user.oauthIntegrations?.garmin;
  if (!g?.accessToken) return null;
  const expiresAt = g.expiresAt ? Date.parse(g.expiresAt) : 0;
  if (expiresAt && expiresAt > Date.now() + 60_000) {
    return g.accessToken;
  }
  if (!g.refreshToken) return g.accessToken;
  const refreshed = await refreshGarminTokens(g.refreshToken);
  g.accessToken = refreshed.access_token;
  g.refreshToken = refreshed.refresh_token || g.refreshToken;
  if (refreshed.expires_in) {
    g.expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  }
  user.oauthIntegrations.garmin = g;
  return g.accessToken;
}

/** Statut des intégrations — propre à chaque utilisateur authentifié */
app.get('/integrations', authMiddleware, (req, res) => {
  const { user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ ok: true, integrations: integrationStatusForClient(user) });
});

app.post('/integrations/garmin/exchange', authMiddleware, async (req, res) => {
  const code = String(req.body?.code ?? '').trim();
  const codeVerifier = String(req.body?.codeVerifier ?? '').trim();
  const redirectUri = String(req.body?.redirectUri ?? '').trim();
  if (!code || !codeVerifier) {
    return res.status(400).json({ error: 'code et codeVerifier requis' });
  }
  const { users, user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  try {
    const tokens = await exchangeGarminTokens({ code, codeVerifier, redirectUri });
    const accessToken = tokens.access_token;
    const uid = await garminUserId(accessToken);
    user.oauthIntegrations = user.oauthIntegrations || {};
    user.oauthIntegrations.garmin = {
      accessToken,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : undefined,
      garminUserId: uid,
      displayName: uid ? `Garmin #${uid}` : 'Garmin Connect',
      connectedAt: new Date().toISOString(),
    };
    user.updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ ok: true, integrations: integrationStatusForClient(user) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message || 'Échange Garmin impossible' });
  }
});

app.delete('/integrations/garmin', authMiddleware, (req, res) => {
  const { users, user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.oauthIntegrations?.garmin) {
    delete user.oauthIntegrations.garmin;
    user.updatedAt = new Date().toISOString();
    saveUsers(users);
  }
  res.json({ ok: true, integrations: integrationStatusForClient(user) });
});

app.post('/integrations/strava/exchange', authMiddleware, async (req, res) => {
  const code = String(req.body?.code ?? '').trim();
  const redirectUri = String(req.body?.redirectUri ?? '').trim();
  if (!code) return res.status(400).json({ error: 'code requis' });
  const { users, user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  try {
    const tokens = await exchangeStravaTokens({ code, redirectUri });
    user.oauthIntegrations = user.oauthIntegrations || {};
    user.oauthIntegrations.strava = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at
        ? new Date(tokens.expires_at * 1000).toISOString()
        : undefined,
      stravaAthleteId: tokens.athlete?.id,
      displayName: [tokens.athlete?.firstname, tokens.athlete?.lastname].filter(Boolean).join(' ') || 'Strava',
      connectedAt: new Date().toISOString(),
    };
    user.updatedAt = new Date().toISOString();
    saveUsers(users);
    res.json({ ok: true, integrations: integrationStatusForClient(user) });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message || 'Échange Strava impossible' });
  }
});

app.delete('/integrations/strava', authMiddleware, (req, res) => {
  const { users, user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.oauthIntegrations?.strava) {
    delete user.oauthIntegrations.strava;
    user.updatedAt = new Date().toISOString();
    saveUsers(users);
  }
  res.json({ ok: true, integrations: integrationStatusForClient(user) });
});

/** Pousse une séance vers Garmin Connect + calendrier (sync montre via app Garmin) */
app.post('/integrations/garmin/workout', authMiddleware, async (req, res) => {
  const body = req.body ?? {};
  const envelope = body.workout ?? body;
  const scheduleDate = String(
    body.scheduleDate ?? envelope?.scheduleDate ?? '',
  ).trim();
  const payload = envelope?.workout ?? envelope;
  if (!payload?.workoutName) {
    return res.status(400).json({ error: 'workoutName requis' });
  }
  const { users, user } = findAuthedUser(req.authEmail);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  try {
    const accessToken = await garminAccessTokenForUser(user);
    if (!accessToken) {
      return res.status(403).json({ error: 'Garmin Connect non lié à ce compte' });
    }
    saveUsers(users);

    const gRes = await fetch('https://apis.garmin.com/training-api/workout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const gBody = await gRes.json().catch(() => ({}));
    if (!gRes.ok) {
      const msg =
        gBody.message || gBody.error || `Garmin Training API ${gRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const workoutId = gBody.workoutId ?? gBody.id;
    let scheduleId = null;
    const dateToSchedule = scheduleDate || new Date().toISOString().slice(0, 10);

    if (workoutId) {
      const schedRes = await fetch('https://apis.garmin.com/training-api/schedule', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workoutId, date: dateToSchedule }),
      });
      if (schedRes.ok) {
        const schedBody = await schedRes.json().catch(() => ({}));
        scheduleId = schedBody.workoutScheduleId ?? schedBody.scheduleId ?? null;
      } else {
        console.warn('[garmin] schedule fallback', schedRes.status, await schedRes.text());
      }
    }

    const saved = {
      id: workoutId || `gw_${Date.now()}`,
      scheduleId,
      calendarDate: dateToSchedule,
      ...payload,
      garminUserId: user.oauthIntegrations?.garmin?.garminUserId,
      ownerEmail: user.email,
      receivedAt: new Date().toISOString(),
    };
    workouts.push(saved);
    if (user.oauthIntegrations?.garmin) {
      user.oauthIntegrations.garmin.lastSyncAt = new Date().toISOString();
      saveUsers(users);
    }

    const dateLabel = new Date(`${dateToSchedule}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    res.status(201).json({
      ok: true,
      garminWorkoutId: saved.id,
      scheduleId,
      calendarDate: dateToSchedule,
      message: scheduleId
        ? `Séance planifiée le ${dateLabel} sur Garmin Connect. Synchronise ta montre dans l’app Garmin Connect pour la récupérer.`
        : `Séance publiée sur Garmin Connect. Synchronise ta montre dans l’app Garmin Connect pour la récupérer.`,
    });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: e.message || 'Envoi Garmin impossible' });
  }
});

app.post('/workout', (req, res) => {
  const payload = req.body;
  if (!payload?.workoutName) {
    return res.status(400).json({ error: 'workoutName requis' });
  }
  const saved = { id: `gw_${Date.now()}`, ...payload, receivedAt: new Date().toISOString() };
  workouts.push(saved);
  res.status(201).json({ ok: true, garminWorkoutId: saved.id });
});

app.post('/strava/activities', (req, res) => {
  const payload = req.body;
  if (!payload?.name || !payload?.elapsed_time) {
    return res.status(400).json({ error: 'name et elapsed_time requis' });
  }
  const saved = { id: `st_${Date.now()}`, ...payload, receivedAt: new Date().toISOString() };
  activities.push(saved);
  res.status(201).json({ ok: true, stravaActivityId: saved.id });
});

app.post('/webhooks/garmin/health', (req, res) => {
  healthEvents.push({ at: new Date().toISOString(), body: req.body });
  res.status(200).json({ ok: true });
});

app.get('/webhooks/strava', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === (process.env.STRAVA_VERIFY_TOKEN || 'training-demo')) {
    return res.json({ 'hub.challenge': challenge });
  }
  res.status(403).end();
});

app.post('/webhooks/strava', (req, res) => {
  activities.push({ at: new Date().toISOString(), event: req.body });
  res.status(200).json({ ok: true });
});

/** Suppression réelle du compte et de toutes ses données (exigence Apple 5.1.1 / Google / RGPD). */
app.delete('/account', authMiddleware, (req, res) => {
  const users = loadUsers();
  const me = users.find((u) => String(u.email ?? '').toLowerCase() === String(req.authEmail).toLowerCase());
  const username = String(me?.username ?? '').toLowerCase();
  saveUsers(users.filter((u) => u !== me && u.email !== req.authEmail));
  deleteDoc(userDocName('sync', req.authEmail));
  purgeUserCommunity(username);
  res.json({ ok: true });
});

/** Renouvelle le jeton (session glissante : l'app l'appelle à chaque ouverture). */
app.post('/auth/refresh', authMiddleware, (req, res) => {
  res.json({ ok: true, token: issueToken(req.authEmail) });
});

/** Déconnecte tous les appareils : les jetons émis avant cet appel deviennent invalides. */
app.post('/auth/logout-all', authMiddleware, (req, res) => {
  const users = loadUsers();
  const me = users.find((u) => String(u.email ?? '').toLowerCase() === String(req.authEmail).toLowerCase());
  if (me) {
    me.tokenVersion = (me.tokenVersion ?? 0) + 1;
    saveUsers(users);
  }
  res.json({ ok: true });
});

/**
 * Synchronisation des données d'entraînement entre appareils.
 * GET  /sync/state → dernier instantané { savedAt, deviceId, state } (ou state:null)
 * PUT  /sync/state { state, deviceId, baseSavedAt } → enregistre ; 409 + instantané serveur si un AUTRE appareil
 *      a écrit depuis la version connue du client (le client fusionne puis renvoie).
 */
app.get('/sync/state', authMiddleware, (req, res) => {
  const snap = readDoc(userDocName('sync', req.authEmail), () => null);
  res.json({ ok: true, snapshot: snap });
});

app.put('/sync/state', authMiddleware, (req, res) => {
  const { state, deviceId, baseSavedAt } = req.body ?? {};
  if (!state || typeof state !== 'object' || !deviceId) {
    return res.status(400).json({ error: 'state et deviceId requis' });
  }
  const name = userDocName('sync', req.authEmail);
  const current = readDoc(name, () => null);
  if (current && current.deviceId !== deviceId && current.savedAt !== (baseSavedAt ?? null)) {
    return res.status(409).json({ error: 'Version plus récente sur le serveur', snapshot: current });
  }
  const snapshot = { savedAt: new Date().toISOString(), deviceId: String(deviceId).slice(0, 64), state };
  writeDoc(name, snapshot);
  res.json({ ok: true, savedAt: snapshot.savedAt });
});

mountCommunityRoutes(app, { authMiddleware, loadUsers });
mountBillingRoutes(app, { authMiddleware, loadUsers, saveUsers });

const port = Number(process.env.PORT || 8787);
authSecret(); // échoue tout de suite en production si le secret manque
await initStorage();
const server = app.listen(port, () => {
  console.log(`mova-api on http://localhost:${port} (stockage : ${storageMode()})`);
});

async function shutdown() {
  server.close();
  await flushStorage();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
