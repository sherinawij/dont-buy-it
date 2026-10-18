// Line icons for the bottom tab bar, drawn with SVG so they take the tab's tint colour.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const ICONS = {
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  wins: <Path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4" />,
  week: (
    <>
      <Rect x={4} y={5} width={16} height={15} rx={2} />
      <Path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  settings: (
    <>
      <Circle cx={12} cy={12} r={3.2} />
      <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
};

export default function TabIcon({ name, color, size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}
