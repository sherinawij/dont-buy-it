// One chat message. Sprout's bubbles sit on the left (white), the user's on the right (green).
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, radius, font } from '../../theme';

export default function ChatBubble({ role, text }) {
  const isUser = role === 'user';

  // Fade + slide up when the bubble first appears.
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [appear]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        isUser ? styles.user : styles.sprout,
        { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
      accessibilityLabel={`${isUser ? 'You' : 'Sprout'}: ${text}`}
    >
      {!isUser && <Text style={styles.name}>Sprout</Text>}
      <Text style={[styles.text, isUser && { color: '#fff' }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md, marginVertical: 4 },
  sprout: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  name: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  text: { fontSize: font.body, color: colors.text, lineHeight: 23 },
});
