import { Redirect } from 'expo-router';

/** Ancienne route → Applications connectées */
export default function IntegrationsRedirect() {
  return <Redirect href="/settings/devices" />;
}
