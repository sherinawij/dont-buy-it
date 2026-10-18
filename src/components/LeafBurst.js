import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import useCelebration from './sprout/useCelebration';

const LEAVES = Array.from({ length: 14 }, (_, index) => ({
  x: Math.cos((index / 14) * Math.PI * 2) * (85 + (index % 3) * 22),
  lift: 45 + (index % 4) * 18,
  spin: (index % 2 ? 1 : -1) * (100 + index * 23),
  color: ['#5BAE70', '#A6CF80', '#2E7D4F', '#D8BC5E'][index % 4],
}));

export default function LeafBurst({ trigger }) {
  const { progress } = useCelebration(trigger);
  const opacity = progress.interpolate({ inputRange: [0, 0.06, 0.65, 1], outputRange: [0, 1, 1, 0] });
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
      {LEAVES.map((leaf, index) => (
        <Animated.View key={index} style={[styles.leaf, { opacity, transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, leaf.x] }) },
          { translateY: progress.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -leaf.lift, 65 + index * 3] }) },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${leaf.spin}deg`] }) },
          { scale: progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.3, 1, 0.6] }) },
        ] }]}>
          <Svg width={18} height={25} viewBox="0 0 18 25">
            <Path d="M9 23 C-3 17 0 6 15 1 C19 12 16 19 9 23 Z" fill={leaf.color} />
            <Path d="M8 23 L12 8" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.6} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10 },
  leaf: { position: 'absolute', left: '50%', top: '40%', marginLeft: -9, marginTop: -12 },
});
