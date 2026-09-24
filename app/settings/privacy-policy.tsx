import { Redirect, type Href } from 'expo-router';

/** Ancien lien : la politique de confidentialité a désormais sa propre page. */
export default function PrivacyPolicyRedirect() {
  return <Redirect href={"/settings/legal/privacy" as Href} />;
}
