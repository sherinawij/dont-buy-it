// Tap-to-send reply chips (the server always includes one surrender option).
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, font } from '../../theme';

export default function SuggestedReplies({ replies, onPick, disabled }) {
  if (!replies?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {replies.map((r) => (
        <Pressable
          key={r}
          onPress={() => onPick(r)}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chip, (pressed || disabled) && { opacity: 0.5 }]}
        >
          <Text style={styles.text}>{r}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  text: { fontSize: font.small, color: colors.primaryDark, fontWeight: '600' },
});
