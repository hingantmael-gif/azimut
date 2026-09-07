import { Platform, Share } from 'react-native';
import type { AppState } from '../data/seed';

export type UserDataExport = {
  exportedAt: string;
  app: 'azimut';
  profile: AppState['profile'];
  health: AppState['health'];
  plan: AppState['plan'];
  activities: AppState['activities'];
  analyses: AppState['analyses'];
  feedbacks: AppState['feedbacks'];
  banister: AppState['banister'];
  lifetime: AppState['lifetime'];
  progress: AppState['progress'];
};

export function buildUserDataExport(state: AppState): UserDataExport {
  return {
    exportedAt: new Date().toISOString(),
    app: 'azimut',
    profile: state.profile,
    health: state.health,
    plan: state.plan,
    activities: state.activities,
    analyses: state.analyses,
    feedbacks: state.feedbacks,
    banister: state.banister,
    lifetime: state.lifetime,
    progress: state.progress,
  };
}

export async function downloadUserData(state: AppState): Promise<void> {
  const payload = buildUserDataExport(state);
  const json = JSON.stringify(payload, null, 2);
  const filename = `azimut-donnees-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    message: json,
    title: filename,
  });
}
