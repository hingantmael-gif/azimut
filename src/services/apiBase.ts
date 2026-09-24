/** Base URL API — partagée auth + community (évite import circulaire). */
export function resolveApiUrl(): string {
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
