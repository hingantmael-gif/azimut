import type { ColorValue } from 'react-native';
import {
  IconAdd,
  IconBody,
  IconCalendar,
  IconHome,
  IconPerson,
} from './AppIcons';

type TabIconProps = {
  name: 'accueil' | 'plan' | 'corps' | 'vous' | 'record';
  focused: boolean;
  color: ColorValue;
  size?: number;
};

export function TabIcon({ name, focused, color, size = 24 }: TabIconProps) {
  const stroke = color;
  switch (name) {
    case 'accueil':
      return <IconHome size={size} color={stroke} />;
    case 'plan':
      return <IconCalendar size={size} color={stroke} />;
    case 'corps':
      return <IconBody size={size} color={stroke} />;
    case 'vous':
      return <IconPerson size={size} color={stroke} />;
    case 'record':
      return <IconAdd size={size} color={stroke} />;
    default:
      return null;
  }
}

export const TAB_ICON_NAMES = {
  accueil: 'accueil',
  plan: 'plan',
  corps: 'corps',
  vous: 'vous',
  record: 'record',
} as const;

/** @deprecated use TabIcon with name prop */
export function TabIconLegacy() {
  return null;
}
