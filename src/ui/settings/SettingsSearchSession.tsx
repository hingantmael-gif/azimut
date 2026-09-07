import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { clearSettingsSearchDraft } from '../../storage/settingsSearchDraft';

/** Vide la recherche paramètres uniquement en sortant de /settings/*. */
export function SettingsSearchSession() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const wasInSettings = prevPath.current.startsWith('/settings');
    const nowInSettings = pathname.startsWith('/settings');
    if (wasInSettings && !nowInSettings) {
      clearSettingsSearchDraft();
    }
    prevPath.current = pathname;
  }, [pathname]);

  return null;
}
