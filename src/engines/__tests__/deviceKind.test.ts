import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, Share: {} }));

import { detectDeviceKind, isMobileDevice } from '../../utils/deviceKind';

const withNavigator = (userAgent: string, maxTouchPoints = 0) =>
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints });

describe('detectDeviceKind (web)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reconnaît un iPhone, un Android et un ordinateur', () => {
    withNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', 5);
    expect(detectDeviceKind()).toBe('ios');
    withNavigator('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36', 5);
    expect(detectDeviceKind()).toBe('android');
    withNavigator('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36', 0);
    expect(detectDeviceKind()).toBe('desktop');
  });

  it('un iPad qui se présente comme un Mac est reconnu grâce à l’écran tactile', () => {
    withNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5);
    expect(detectDeviceKind()).toBe('ios');
    withNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 0);
    expect(detectDeviceKind()).toBe('desktop');
  });

  it('seul l’ordinateur n’est pas « mobile » (pas de câble USB sur un téléphone)', () => {
    expect(isMobileDevice('ios')).toBe(true);
    expect(isMobileDevice('android')).toBe(true);
    expect(isMobileDevice('desktop')).toBe(false);
  });
});
