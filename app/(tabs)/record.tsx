import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BRAND } from '../../src/constants/brand';

/**
 * Onglet Enregistrer — ouvre directement le tracker (pré-départ).
 * Le tap barre d’onglets est aussi intercepté dans `_layout` ; ce redirect
 * couvre les deep links / router.navigate('/(tabs)/record').
 */
export default function RecordScreen() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace({
        pathname: '/session/live',
        params: { mode: 'free', sport: 'run' },
      });
    }, [router]),
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: BRAND.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={BRAND.accent} />
    </View>
  );
}
