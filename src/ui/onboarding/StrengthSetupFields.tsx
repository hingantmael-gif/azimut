import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  STRENGTH_BODY_FOCUS_OPTIONS,
  STRENGTH_EQUIPMENT_OPTIONS,
  STRENGTH_GOAL_OPTIONS,
  type StrengthBodyFocus,
  type StrengthEquipment,
  type StrengthGoalFocus,
} from '../../engines/strengthProgramming';
import { colors, radii, spacing } from '../../theme/tokens';

type EquipmentProps = {
  selected: StrengthEquipment[];
  onToggle: (id: StrengthEquipment) => void;
};

/** Matériel disponible — sélection multiple. */
export function StrengthEquipmentPicker({ selected, onToggle }: EquipmentProps) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {STRENGTH_EQUIPMENT_OPTIONS.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onToggle(opt.id)}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type GoalProps = {
  selected: StrengthGoalFocus | null;
  onSelect: (id: StrengthGoalFocus) => void;
};

/** Objectif musculaire — un seul choix. */
export function StrengthGoalPicker({ selected, onSelect }: GoalProps) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {STRENGTH_GOAL_OPTIONS.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(opt.id)}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type BodyFocusProps = {
  selected: StrengthBodyFocus | null;
  onSelect: (id: StrengthBodyFocus) => void;
};

/** Zones à travailler — haut / bas / les deux. */
export function StrengthBodyFocusPicker({ selected, onSelect }: BodyFocusProps) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {STRENGTH_BODY_FOCUS_OPTIONS.map((opt) => {
        const isSelected = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(opt.id)}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.cardLabel}>{opt.label}</Text>
              <Text style={styles.cardDesc}>{opt.desc}</Text>
            </View>
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  cardLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  check: { fontSize: 18, fontWeight: '800', color: colors.accent },
});
