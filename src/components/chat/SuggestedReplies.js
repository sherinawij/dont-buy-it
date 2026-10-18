// Tap-to-send reply chips (the server always includes one surrender option).
// One compact row that scrolls sideways, so the chat keeps its space on small phones.
// flexGrow: 0 matters: without it a horizontal ScrollView inside a column stretches vertically,
// which is what made the chips tall and bubble-shaped before.
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { font } from '../../theme';
import { useStyles } from '../../useTheme';

export default function SuggestedReplies({ replies, onPick, disabled }) {
  const styles = useStyles(makeStyles);
  if (!replies?.length) return null;
  return (
    <ScrollView
      horizontal
      style={styles.scroll}
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
          accessibilityLabel={`Reply: ${r}`}
          style={({ pressed }) => [styles.chip, (pressed || disabled) && { opacity: 0.5 }]}
        >
          <Text style={styles.text} numberOfLines={2}>{r}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
  chip: {
    maxWidth: 240, // long replies wrap to two lines; the next chip peeks in to show the row scrolls
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    paddingVertical: 7,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  text: { fontSize: font.small, lineHeight: 18, color: colors.primaryDark, fontWeight: '600' },
});
