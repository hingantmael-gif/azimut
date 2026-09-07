import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppTextInput } from '../src/ui/AppTextInput';
import { Body, Chip, Muted, Screen, Title } from '../src/ui/primitives';
import { computeNutrition } from '../src/engines/core';
import { colors, radii, spacing } from '../src/theme/tokens';
import { SportAtmosphereBanner } from '../src/ui/SportAtmosphereBanner';
import { ATMOSPHERE_IMAGES } from '../src/constants/sportVisuals';

/** CDC §9.B — Nutrition */
export default function NutritionScreen() {
  const [duration, setDuration] = useState('90');
  const [temp, setTemp] = useState('22');
  const [intensity, setIntensity] = useState<'easy' | 'tempo' | 'hard'>('tempo');

  const plan = useMemo(
    () =>
      computeNutrition({
        durationMin: Number(duration) || 60,
        intensity,
        tempC: Number(temp) || 20,
      }),
    [duration, intensity, temp],
  );

  return (
    <Screen>
      <Title>Nutrition & hydratation</Title>
      <Muted>Eau (mL), glucides (g/h), rappels montre toutes les 20 min.</Muted>
      <View style={{ marginTop: spacing.md }}>
        <SportAtmosphereBanner
          source={ATMOSPHERE_IMAGES.bike}
          title="Fuel ta sortie"
          subtitle="Hydratation & glucides adaptés à l’effort"
        />
      </View>
      <AppTextInput
        style={styles.input}
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
        placeholder="Durée (min)"
        placeholderTextColor={colors.textMuted}
      />
      <AppTextInput
        style={styles.input}
        value={temp}
        onChangeText={setTemp}
        keyboardType="number-pad"
        placeholder="Température °C"
        placeholderTextColor={colors.textMuted}
      />
      <View style={styles.row}>
        <Chip label="Easy" selected={intensity === 'easy'} onPress={() => setIntensity('easy')} />
        <Chip label="Tempo" selected={intensity === 'tempo'} onPress={() => setIntensity('tempo')} />
        <Chip label="Hard" selected={intensity === 'hard'} onPress={() => setIntensity('hard')} />
      </View>
      <View style={styles.card}>
        <Body>Eau : {plan.waterMl} mL</Body>
        <Body>Glucides : {plan.carbsGPerHour} g/h</Body>
        <Body>Rappel : toutes les {plan.reminderEveryMin} min</Body>
        {plan.tips.map((t) => (
          <Muted key={t}>• {t}</Muted>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radii.sm,
    padding: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  card: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    gap: 6,
  },
});
