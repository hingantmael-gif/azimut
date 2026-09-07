import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSegments } from 'expo-router';
import { useApp } from '../../store/AppContext';
import { LevelUpCelebration } from './LevelUpCelebration';

/** Routes où une célébration de niveau doit attendre la fin du parcours. */
function shouldDeferLevelUp(pathname: string | null, segments: string[]): boolean {
  const path = (pathname ?? '').toLowerCase();
  const segs = segments.map((s) => s.toLowerCase());

  if (path.includes('program/new') || (segs.includes('program') && segs.includes('new'))) {
    return true;
  }
  if (path.includes('import-activity') || segs.includes('import-activity')) {
    return true;
  }
  if (path.includes('session/rpe') || (segs.includes('session') && segs.includes('rpe'))) {
    return true;
  }
  if (path.includes('(auth)') || segs.includes('(auth)')) {
    return true;
  }
  return false;
}

/**
 * Affiche le level-up partout dans l’app.
 * Reporté pendant création/import/RPE / revue de programme.
 */
export function GlobalLevelUpHost() {
  const { state, dispatch } = useApp();
  const pathname = usePathname();
  const segments = useSegments();
  const ranked = state.profile.ranked;
  const pendingReview = Boolean(state.profile.pendingProgramReviewId);

  const defer = useMemo(
    () => pendingReview || shouldDeferLevelUp(pathname, segments as string[]),
    [pathname, segments, pendingReview],
  );

  const pendingLevel = useMemo(() => {
    const seen = ranked.lastCelebratedLevel ?? ranked.level;
    return ranked.level > seen ? ranked.level : null;
  }, [ranked.level, ranked.lastCelebratedLevel]);

  const [visible, setVisible] = useState(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!pendingLevel || defer) {
      setVisible(false);
      return;
    }
    setLevel(pendingLevel);
    setVisible(true);
  }, [pendingLevel, defer]);

  if (!visible || !level) return null;

  return (
    <LevelUpCelebration
      visible
      level={level}
      onDone={() => {
        setVisible(false);
        dispatch({ type: 'CELEBRATE_LEVEL', level });
      }}
    />
  );
}
