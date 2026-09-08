/**
 * Client auth Azimut → API (inscription e-mail + Google).
 * En cas d’API injoignable, les écrans basculent sur le stockage local.
 */
function resolveApiUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) return fromEnv;
  if (typeof globalThis !== 'undefined') {
    const loc = (globalThis as { location?: { hostname?: string } }).location;
    const host = loc?.hostname ?? '';
    if (host.includes('github.io') || host.includes('onrender.com')) {
      return 'https://azimut-auth-api.onrender.com';
    }
  }
  return fromEnv || 'http://localhost:8787';
}

const API_URL = resolveApiUrl();

export type AuthUserDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  emailVerified: boolean;
};

async function postJson<T>(
  path: string,
  body: unknown,
): Promise<T & { error?: string; ok?: boolean }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; ok?: boolean };
    if (!res.ok) {
      return { ...data, error: data.error || `Erreur ${res.status}` };
    }
    return data;
  } catch {
    return { error: 'API injoignable' } as T & { error?: string; ok?: boolean };
  }
}

export async function apiRequestOtp(email: string) {
  return postJson<{
    mailSent?: boolean;
    demoCode?: string;
    message?: string;
  }>('/auth/request-otp', { email });
}

export async function apiResendOtp(email: string) {
  return postJson<{ mailSent?: boolean; demoCode?: string }>('/auth/resend-2fa', { email });
}

export async function apiVerifyOtp(email: string, code: string) {
  return postJson<{ token?: string; user?: AuthUserDto }>('/auth/verify-2fa', { email, code });
}

export async function apiCompleteProfile(body: {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}) {
  return postJson<{ token?: string; user?: AuthUserDto }>('/auth/complete-profile', body);
}

/** Inscription directe e-mail + mot de passe (sans OTP). */
export async function apiSignup(body: {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}) {
  return postJson<{ token?: string; user?: AuthUserDto; ok?: boolean }>('/auth/signup', body);
}

export async function apiLogin(emailOrUsername: string, password: string) {
  return postJson<{ token?: string; user?: AuthUserDto }>('/auth/login', {
    emailOrUsername,
    password,
  });
}

export async function apiDeleteTrialAccount(emailOrUsername: string, password: string) {
  return postJson<{ ok?: boolean }>('/auth/delete-trial', {
    emailOrUsername,
    password,
  });
}

export async function apiGoogleAuth(accessToken: string) {
  return postJson<{ token?: string; user?: AuthUserDto; isNew?: boolean }>('/auth/google', {
    accessToken,
  });
}

export { API_URL };

/** Compat anciens noms */
export async function apiRegister(body: {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}) {
  return apiSignup(body);
}

export async function apiVerify2fa(email: string, code: string) {
  return apiVerifyOtp(email, code);
}
