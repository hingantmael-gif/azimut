import type { ColorValue } from 'react-native';
import {
  IconAdd,
  IconBody,
  IconCalendar,
  IconHome,
  IconPerson,
  IconRecord,
} from './AppIcons';

type TabIconProps = {
  name: 'accueil' | 'plan' | 'corps' | 'vous' | 'record' | 'create';
  focused: boolean;
  color: ColorValue;
  size?: number;
};

export function TabIcon({ name, focused, color, size = 24 }: TabIconProps) {
  const stroke = color;
  let icon = null;
  switch (name) {
    case 'accueil':
      icon = <IconHome size={size} color={stroke} />;
      break;
    case 'plan':
      icon = <IconCalendar size={size} color={stroke} />;
      break;
    case 'corps':
      icon = <IconBody size={size} color={stroke} />;
      break;
    case 'vous':
      icon = <IconPerson size={size} color={stroke} />;
      break;
    case 'record':
      icon = <IconRecord size={size} color={stroke} />;
      break;
    case 'create':
      icon = <IconAdd size={size} color={stroke} />;
      break;
    default:
      icon = null;
  }
  return <>{icon}</>;
}

export const TAB_ICON_NAMES = {
  accueil: 'accueil',
  plan: 'plan',
  corps: 'corps',
  vous: 'vous',
  record: 'record',
  create: 'create',
} as const;
