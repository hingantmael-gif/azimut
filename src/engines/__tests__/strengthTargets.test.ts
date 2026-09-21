import { describe, expect, it } from 'vitest';
import { buildStrengthSession, STRENGTH_TARGET_OPTIONS, type StrengthEquipment, type StrengthTarget } from '../strengthProgramming';

const names = (equipment: StrengthEquipment[], targets: StrengthTarget[], slot = 0) =>
  buildStrengthSession({
    date: '2026-09-21', slotIndex: slot, trainingDaysCount: 4, level: 'intermediaire', block: 'developpement_general',
    equipment, strengthGoal: 'hypertrophy', targets,
  }).steps.filter((s) => s.type === 'active').map((s) => (s.label ?? '').split(' · ')[0]!);

const EQUIPMENTS: StrengthEquipment[][] = [['gym'], ['home_dumbbells'], ['bodyweight'], ['bands'], ['home_machines']];

describe('musculation : cibles précises', () => {
  it('chaque cible donne au moins 4 exercices, quel que soit le matériel', () => {
    for (const eq of EQUIPMENTS) {
      for (const t of STRENGTH_TARGET_OPTIONS) {
        expect(names(eq, [t.id]).length, `${eq.join()}/${t.id}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('abdos : aucun exercice de squat, développé ou curl', () => {
    for (const eq of EQUIPMENTS) {
      const n = names(eq, ['abs']).join(' | ');
      expect(n).not.toMatch(/squat|développé|curl|fente|rowing|pompes/i);
    }
  });

  it('jambes : aucun exercice de haut du corps', () => {
    for (const eq of EQUIPMENTS) {
      const n = names(eq, ['legs']).join(' | ');
      expect(n).not.toMatch(/développé couché|curl biceps|curl marteau|rowing|tirage|pompes|planche|crunch/i);
    }
  });

  it('bras : uniquement des exercices de bras (curls, triceps, dips, pompes diamant…)', () => {
    const n = names(['gym'], ['arms']).join(' | ');
    expect(n).toMatch(/curl|triceps|dips/i);
    expect(n).not.toMatch(/squat|presse|planche/i);
  });

  it('deux séances de la semaine ne sont pas identiques', () => {
    const a = names(['gym'], ['back'], 0).join();
    const b = names(['gym'], ['back'], 1).join();
    expect(a).not.toBe(b);
  });

  it('plusieurs cibles : dos + bras mélange les deux', () => {
    const n = names(['gym'], ['back', 'arms']).join(' | ');
    expect(n).toMatch(/rowing|tirage|traction/i);
    expect(n).toMatch(/curl|triceps|dips/i);
  });
});
