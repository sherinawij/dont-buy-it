// One chat message. Sprout's bubbles sit on the left (white) next to a mini Sprout wearing the
// expression it had when it said that line; the user's bubbles sit on the right (green).
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import SproutAvatar from './SproutAvatar';
import { radius, font } from '../../theme';
import { useStyles } from '../../useTheme';

export default function ChatBubble({ role, text, mood = 'smug', stage = 1 }) {
  const styles = useStyles(makeStyles);
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
        <Text style={[styles.text, styles.userText]}>{text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.sproutRow, motion]} accessibilityLabel={`Sprout: ${text}`}>
      {/* still: no idle animation, so a long chat of avatars stays calm */}
      <SproutAvatar stage={stage} mood={mood} still />
      <View style={[styles.bubble, styles.sprout]}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  sproutRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 4, maxWidth: '92%' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.md },
  sprout: {
    flexShrink: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  user: { alignSelf: 'flex-end', maxWidth: '82%', marginVertical: 4, backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
  userText: { color: colors.onUserBubble },
  text: { fontSize: font.body, color: colors.text, lineHeight: 23 },
});
