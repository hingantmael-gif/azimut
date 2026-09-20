import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { SettingsScreen } from '../../../src/ui/settings/SettingsList';
import { LegalDocView } from '../../../src/ui/legal/LegalUi';
import { LEGAL_DOCS, isLegalDocId } from '../../../src/legal/legalDocs';

/** Un document du centre légal (CGU, confidentialité, santé, autorisations, mentions). */
export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  if (!isLegalDocId(doc)) return <Redirect href="/settings/terms" />;
  const d = LEGAL_DOCS[doc];
  return (
    <SettingsScreen>
      <Stack.Screen options={{ title: d.title }} />
      <LegalDocView doc={d} />
    </SettingsScreen>
  );
}
