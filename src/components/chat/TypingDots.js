// "Sprout is thinking…" — a mini Sprout reacting live (smug → nervous → panicking as the meter fills)
// next to three dots bouncing one after another.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import SproutAvatar from './SproutAvatar';
import { colors, radius } from '../../theme';

export default function TypingDots({ mood = 'smug', stage = 1 }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Each dot goes up and down; the 150ms stagger makes the "wave".
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View style={styles.row} accessibilityLabel="Sprout is thinking">
      <SproutAvatar stage={stage} mood={mood} />
      <View style={styles.bubble}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 4 },
  bubble: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.leaf },
});
