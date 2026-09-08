import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { isTrialCredentials, TRIAL_ACCOUNT_EMAIL, TRIAL_EMAIL_INPUT } from '../utils/demoAuth';

const CREDENTIALS_KEY = '@azimut/local-credentials-v1';

export type LocalCredential = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  /** SHA-256(salt + password) */
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
};

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

async function loadAll(): Promise<LocalCredential[]> {
  const raw = await AsyncStorage.getItem(CREDENTIALS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocalCredential[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveAll(list: LocalCredential[]): Promise<void> {
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(list));
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normUser(username: string): string {
  return username.trim().toLowerCase().replace(/^@+/, '');
}

/** Enregistre / met à jour un compte local (après inscription réussie). */
export async function saveLocalCredential(input: {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<void> {
  const email = normEmail(input.email);
  const username = normUser(input.username);
  if (!email || !username || !input.password) return;

  const list = await loadAll();
  const salt = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${email}:${Date.now()}:${Math.random()}`,
  );
  const passwordHash = await hashPassword(input.password, salt);
  const now = new Date().toISOString();
  const next = list.filter(
    (c) => normEmail(c.email) !== email && normUser(c.username) !== username,
  );
  next.push({
    email,
    username,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    passwordHash,
    salt,
    createdAt: now,
    updatedAt: now,
  });
  await saveAll(next);
}

export async function findLocalCredential(
  emailOrUsername: string,
): Promise<LocalCredential | null> {
  const id = emailOrUsername.trim().toLowerCase().replace(/^@+/, '');
  if (!id) return null;
  const list = await loadAll();
  return (
    list.find((c) => normEmail(c.email) === id || normUser(c.username) === id) ?? null
  );
}

export async function verifyLocalCredentials(
  emailOrUsername: string,
  password: string,
): Promise<LocalCredential | null> {
  if (isTrialCredentials(emailOrUsername, password)) {
    return {
      email: TRIAL_ACCOUNT_EMAIL,
      username: TRIAL_EMAIL_INPUT,
      firstName: '1',
      lastName: '1',
      passwordHash: '',
      salt: '',
      createdAt: '',
      updatedAt: '',
    };
  }
  const found = await findLocalCredential(emailOrUsername);
  if (!found) return null;
  const hash = await hashPassword(password, found.salt);
  if (hash !== found.passwordHash) return null;
  return found;
}

export async function removeLocalCredential(emailOrUsername: string): Promise<void> {
  const id = emailOrUsername.trim().toLowerCase().replace(/^@+/, '');
  const list = await loadAll();
  await saveAll(
    list.filter((c) => normEmail(c.email) !== id && normUser(c.username) !== id),
  );
}
