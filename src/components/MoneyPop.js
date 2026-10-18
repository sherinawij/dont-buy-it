import { Animated, StyleSheet, View } from 'react-native';
import useCelebration from './sprout/useCelebration';

export default function MoneyPop({ amount, trigger }) {
  const { progress, scale } = useCelebration(trigger);
  const value = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  const label = `+$${value.toFixed(Number.isInteger(value) ? 0 : 2)}`;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
      <Animated.Text style={[styles.text, {
        opacity: progress.interpolate({ inputRange: [0, 0.04, 0.65, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { scale },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, -55] }) },
        ],
      }]}>{label}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', zIndex: 11 },
  text: { color: '#1F5E3A', backgroundColor: '#F4FAF2', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, fontSize: 28, fontWeight: '800' },
});
