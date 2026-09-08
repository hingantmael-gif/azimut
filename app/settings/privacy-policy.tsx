import { Redirect } from 'expo-router';

/** Confidentialité réunie dans les Conditions d’utilisation. */
export default function PrivacyPolicyRedirect() {
  return <Redirect href="/settings/terms" />;
}
