// How close the user is to convincing Sprout. A vine that grows along a soft track.
// RULE: no numbers, fractions, percentages or thresholds anywhere — only the bar and earned chips.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { labelFor } from '../rubric';
import { meterFraction } from '../debate/logic';
import { font } from '../theme';
import { useStyles, useTheme } from '../useTheme';

// A tiny leaf drawn with one SVG path; it rides on the tip of the vine.
function Leaf({ size = 18 }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 21C3 11 9 4 21 3c-1 12-8 18-18 18z" fill={colors.leaf} />
      <Path d="M4 20C9 15 13 11 18 6" stroke="#1F5E3A" strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// Words (not numbers) for screen readers.
const a11yText = (f) =>
  f >= 1 ? 'Sprout is convinced' : f > 0.5 ? 'Sprout is wavering' : f > 0 ? 'Sprout is a little shaken' : 'Sprout is not convinced';

// "✓ Replaces something broken" chips — only for criteria the user has already EARNED.
// Separate from the bar so the screen can lay them out full width.
export function EarnedChips({ criteriaMet, style }) {
  const styles = useStyles(makeStyles);
  if (!criteriaMet.length) return null;
  return (
    <View style={[styles.chips, style]}>
      {criteriaMet.map((id) => (
        <View key={id} style={styles.chip}>
          <Text style={styles.chipText}>✓ {labelFor(id)}</Text>
        </View>
      ))}
    </View>
  );
}

// showChips={false} when the screen renders <EarnedChips> itself.
export default function ConvictionMeter({ criteriaMet, showChips = true }) {
  const styles = useStyles(makeStyles);
  const fraction = meterFraction(criteriaMet);

  // Animated width can't use the native driver, so this runs on JS — fine for one small bar.
  const fill = useRef(new Animated.Value(fraction)).current;
  useEffect(() => {
    Animated.spring(fill, { toValue: fraction, friction: 7, tension: 40, useNativeDriver: false }).start();
  }, [fraction, fill]);

  const width = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View accessible accessibilityLabel={a11yText(fraction)}>
      <Text style={styles.label}>{fraction >= 1 ? 'Sprout is convinced…' : 'Convince Sprout'}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.vine, { width }]} />
        {/* The leaf sits at the vine's tip; a negative margin centres it on the end. */}
        <Animated.View style={[styles.tip, { left: width }]}>
          <Leaf />
        </Animated.View>
      </View>
      {showChips && <EarnedChips criteriaMet={criteriaMet} style={{ marginTop: 8 }} />}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  label: { fontSize: font.small, color: colors.muted, fontWeight: '600', marginBottom: 6 },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  vine: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 7, backgroundColor: colors.leaf },
  tip: { position: 'absolute', top: -4, marginLeft: -9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  chipText: { fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
});
