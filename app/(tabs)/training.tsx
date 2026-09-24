import { Redirect } from 'expo-router';

/**
 * Ancien tableau de bord « training » : l'accueil reprend tout (séance du jour, ressenti,
 * indicateurs). Cette route reste pour les anciens liens et renvoie vers l'accueil.
 */
export default function TrainingRedirect() {
  return <Redirect href="/(tabs)" />;
}
