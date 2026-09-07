import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { ColorValue } from 'react-native';

type IconProps = {
  size?: number;
  color: ColorValue;
};

function IconBox({ size = 24, children }: { size?: number; children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

/** Accueil */
export function IconHome({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </IconBox>
  );
}

/** Plan / calendrier */
export function IconCalendar({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Rect x={4} y={5} width={16} height={15} rx={2} stroke={color} strokeWidth={1.8} />
      <Line x1={4} y1={9} x2={20} y2={9} stroke={color} strokeWidth={1.8} />
      <Line x1={8} y1={3} x2={8} y2={7} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={7} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </IconBox>
  );
}

/** Corps */
export function IconBody({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Circle cx={12} cy={5} r={2.2} stroke={color} strokeWidth={1.8} />
      <Path d="M12 8v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 11h8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9 20v-6l3-2 3 2v6" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </IconBox>
  );
}

/** Vous / profil */
export function IconPerson({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Circle cx={12} cy={8} r={3.2} stroke={color} strokeWidth={1.8} />
      <Path
        d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </IconBox>
  );
}

/** Enregistrer + */
export function IconAdd({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Line x1={12} y1={6} x2={12} y2={18} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={6} y1={12} x2={18} y2={12} stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </IconBox>
  );
}

/** Paramètres — engrenage classique (style Strava) */
export function IconSettings({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconBox>
  );
}

/** Recherche */
export function IconSearch({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Circle cx={11} cy={11} r={5.5} stroke={color} strokeWidth={1.8} />
      <Line x1={15.5} y1={15.5} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </IconBox>
  );
}

/** Notifications — cloche */
export function IconBell({ size = 24, color }: IconProps) {
  return (
    <IconBox size={size}>
      <Path
        d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M10 19a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </IconBox>
  );
}
