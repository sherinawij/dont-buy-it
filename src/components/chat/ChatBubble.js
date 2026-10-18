// One chat message. Sprout's bubbles sit on the left (white) next to a mini Sprout wearing the
// expression it had when it said that line; the user's bubbles sit on the right (green).
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Sprout from '../Sprout';
import { colors, radius, font } from '../../theme';

export const AVATAR_SIZE = 44;

export default function ChatBubble({ role, text, mood = 'smug', stage = 1 }) {
  const isUser = role === 'user';

  // Fade + slide up when the bubble first appears.
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [appear]);

  const motion = { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] };

  if (isUser) {
    return (
      <Animated.View style={[styles.bubble, styles.user, motion]} accessibilityLabel={`You: ${text}`}>
        <Text style={[styles.text, { color: '#fff' }]}>{text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.sproutRow, motion]} accessibilityLabel={`Sprout: ${text}`}>
      {/* still: no idle animation, so a long chat of avatars stays calm */}
      <View style={styles.avatar}>
        <Sprout stage={stage} mood={mood} size={AVATAR_SIZE} still />
      </View>
      <View style={[styles.bubble, styles.sprout]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sproutRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 4, maxWidth: '92%' },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  sprout: {
    flexShrink: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  user: { alignSelf: 'flex-end', maxWidth: '82%', marginVertical: 4, backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  text: { fontSize: font.body, color: colors.text, lineHeight: 23 },
});
