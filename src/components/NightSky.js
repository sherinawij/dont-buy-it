// A few gold stars and a moon behind Sprout, shown only on Midnight Garden (dark mode).
// Fills its parent, so put it first inside a container with overflow: 'hidden'.
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../useTheme';

// A 4-point sparkle centred on (x, y), r = half its height.
const star = (x, y, r) =>
  `M${x} ${y - r} L${x + r * 0.2} ${y - r * 0.2} L${x + r} ${y} L${x + r * 0.2} ${y + r * 0.2} ` +
  `L${x} ${y + r} L${x - r * 0.2} ${y + r * 0.2} L${x - r} ${y} L${x - r * 0.2} ${y - r * 0.2}Z`;

const STARS = [
  [12, 14, 2.4],
  [88, 10, 1.8],
  [92, 46, 2.2],
  [8, 62, 1.6],
  [80, 88, 1.8],
  [20, 92, 1.4],
];

export default function NightSky() {
  const { scheme, colors } = useTheme();
  if (scheme !== 'dark') return null;
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      {STARS.map(([x, y, r], i) => (
        <Path key={i} d={star(x, y, r)} fill={colors.sun} opacity={i % 2 ? 0.6 : 0.9} />
      ))}
      {/* crescent moon */}
      <Path d="M90 24 a5 5 0 1 0 4 7 a4 4 0 1 1 -4 -7z" fill={colors.sun} opacity={0.9} />
    </Svg>
  );
}
