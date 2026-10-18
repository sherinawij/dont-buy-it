// Tap-to-send reply chips (the server always includes one surrender option).
// Chips wrap onto new lines instead of scrolling sideways: a horizontal ScrollView inside a column
// stretches vertically on phones, which made the chips tall and bubble-shaped.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../../theme';

export default function SuggestedReplies({ replies, onPick, disabled }) {
  if (!replies?.length) return null;
  return (
    <View style={styles.wrap}>
      {replies.map((r) => (
        <Pressable
          key={r}
          onPress={() => onPick(r)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Reply: ${r}`}
          hitSlop={4}
          style={({ pressed }) => [styles.chip, (pressed || disabled) && { opacity: 0.5 }]}
        >
          <Text style={styles.text} numberOfLines={2}>{r}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  chip: {
    maxWidth: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: { fontSize: font.small, lineHeight: 19, color: colors.primaryDark, fontWeight: '600' },
});
