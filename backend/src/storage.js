/**
 * Stockage de documents JSON de l'API Mova.
 *
 * - Sans DATABASE_URL : fichiers dans backend/data (développement). ATTENTION : sur l'offre gratuite de
 *   Render le disque est effacé à chaque redéploiement — ne pas l'utiliser en production.
 * - Avec DATABASE_URL (PostgreSQL : Neon, Supabase, Render Postgres…) : table `mova_kv`, données durables.
 *
 * Les routes existantes sont synchrones : on garde donc un cache mémoire et on écrit en arrière-plan
 * (file d'attente ordonnée). Les lectures renvoient toujours une COPIE (comme une lecture de fichier).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

const cache = new Map();
let pool = null;
let queue = Promise.resolve();

export function storageMode() {
  return pool ? 'postgres' : 'file';
}

function fileFor(name) {
  const safe = name.replace(/[^a-z0-9_.-]/gi, '_');
  return path.join(dataDir, `${safe}.json`);
}

export async function initStorage() {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[storage] DATABASE_URL absent : stockage sur fichiers (éphémère sur Render). Configure PostgreSQL avant tout lancement public.',
      );
    }
    return;
  }
  const { default: pg } = await import('pg');
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
    max: 4,
  });
  await pool.query(
    'create table if not exists mova_kv (name text primary key, value jsonb not null, updated_at timestamptz not null default now())',
  );
  const { rows } = await pool.query('select name, value from mova_kv');
  for (const r of rows) cache.set(r.name, r.value);
  console.log(`[storage] PostgreSQL connecté (${rows.length} documents)`);
}

function enqueue(task) {
  queue = queue.then(task).catch((e) => console.error('[storage] écriture échouée', e));
}

/** Lit un document (copie). `fallback` est une fonction qui crée la valeur initiale. */
export function readDoc(name, fallback) {
  if (!cache.has(name) && !pool) {
    try {
      cache.set(name, JSON.parse(fs.readFileSync(fileFor(name), 'utf8')));
    } catch {
      /* absent ou illisible : valeur initiale */
    }
  }
  if (cache.has(name)) return structuredClone(cache.get(name));
  return fallback();
}

export function writeDoc(name, value) {
  const copy = structuredClone(value);
  cache.set(name, copy);
  if (pool) {
    enqueue(() =>
      pool.query(
        'insert into mova_kv (name, value, updated_at) values ($1, $2::jsonb, now()) on conflict (name) do update set value = excluded.value, updated_at = now()',
        [name, JSON.stringify(copy)],
      ),
    );
    return;
  }
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(fileFor(name), JSON.stringify(copy, null, 2), 'utf8');
  } catch (e) {
    console.error('[storage] écriture fichier échouée', e);
  }
}

export function deleteDoc(name) {
  cache.delete(name);
  if (pool) {
    enqueue(() => pool.query('delete from mova_kv where name = $1', [name]));
    return;
  }
  try {
    fs.rmSync(fileFor(name), { force: true });
  } catch {
    /* ignore */
  }
}

/** Nom de document sûr pour une donnée par utilisateur. */
export function userDocName(prefix, email) {
  return `${prefix}_${crypto.createHash('sha256').update(String(email)).digest('hex').slice(0, 24)}`;
}

/** Attend la fin des écritures (arrêt propre du serveur). */
export async function flushStorage() {
  await queue;
  if (pool) await pool.end().catch(() => undefined);
}
