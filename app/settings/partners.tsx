import { Redirect } from 'expo-router';

/** Ancien écran marketing → vrai lieu de connexion */
export default function PartnersScreen() {
  return <Redirect href="/settings/devices" />;
}
