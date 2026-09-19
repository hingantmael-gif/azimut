import {
  WizardOptionCard,
  WizardStepShell,
  type WizardTone,
} from '../program/WizardPickers';
import {
  STRENGTH_BODY_FOCUS_OPTIONS,
  STRENGTH_EQUIPMENT_OPTIONS,
  STRENGTH_GOAL_OPTIONS,
  type StrengthBodyFocus,
  type StrengthEquipment,
  type StrengthGoalFocus,
} from '../../engines/strengthProgramming';
import { BRAND } from '../../constants/brand';

type EquipmentProps = {
  selected: StrengthEquipment[];
  onToggle: (id: StrengthEquipment) => void;
  tone?: WizardTone;
  accent?: string;
};

/** Matériel disponible — sélection multiple animée. */
export function StrengthEquipmentPicker({
  selected,
  onToggle,
  tone = 'surface',
  accent = BRAND.accent,
}: EquipmentProps) {
  return (
    <WizardStepShell resetKey={`eq-${tone}`}>
      {STRENGTH_EQUIPMENT_OPTIONS.map((opt, idx) => (
        <WizardOptionCard
          key={opt.id}
          index={idx}
          title={opt.label}
          subtitle={opt.desc}
          selected={selected.includes(opt.id)}
          onPress={() => onToggle(opt.id)}
          accent={accent}
          tone={tone}
        />
      ))}
    </WizardStepShell>
  );
}

type GoalProps = {
  selected: StrengthGoalFocus | null;
  onSelect: (id: StrengthGoalFocus) => void;
  tone?: WizardTone;
  accent?: string;
};

/** Objectif musculaire — un seul choix animé. */
export function StrengthGoalPicker({
  selected,
  onSelect,
  tone = 'surface',
  accent = BRAND.accent,
}: GoalProps) {
  return (
    <WizardStepShell resetKey={`goal-${tone}`}>
      {STRENGTH_GOAL_OPTIONS.map((opt, idx) => (
        <WizardOptionCard
          key={opt.id}
          index={idx}
          title={opt.label}
          selected={selected === opt.id}
          onPress={() => onSelect(opt.id)}
          accent={accent}
          tone={tone}
        />
      ))}
    </WizardStepShell>
  );
}

type BodyFocusProps = {
  selected: StrengthBodyFocus | null;
  onSelect: (id: StrengthBodyFocus) => void;
  tone?: WizardTone;
  accent?: string;
};

/** Zones à travailler — haut / bas / les deux. */
export function StrengthBodyFocusPicker({
  selected,
  onSelect,
  tone = 'surface',
  accent = BRAND.accent,
}: BodyFocusProps) {
  return (
    <WizardStepShell resetKey={`focus-${tone}`}>
      {STRENGTH_BODY_FOCUS_OPTIONS.map((opt, idx) => (
        <WizardOptionCard
          key={opt.id}
          index={idx}
          title={opt.label}
          subtitle={opt.desc}
          selected={selected === opt.id}
          onPress={() => onSelect(opt.id)}
          accent={accent}
          tone={tone}
        />
      ))}
    </WizardStepShell>
  );
}
