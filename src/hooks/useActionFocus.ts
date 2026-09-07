import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

/**
 * Lit `?focus=` (ou params.focus) pour mettre en avant un bouton d’action.
 * Le highlight s’estompe après quelques secondes.
 */
export function useActionFocus(actionId: string, fadeMs = 10000): boolean {
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focus = useMemo(() => {
    const raw = params.focus;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.focus]);

  const match = focus === actionId;
  const [alive, setAlive] = useState(match);

  useEffect(() => {
    if (!match) {
      setAlive(false);
      return;
    }
    setAlive(true);
    const t = setTimeout(() => setAlive(false), fadeMs);
    return () => clearTimeout(t);
  }, [match, fadeMs]);

  return alive;
}
