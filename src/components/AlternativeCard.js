// One cheaper / lower-waste option Sprout pushes after conceding.
// The server only picks a TYPE (from a fixed list) + a one-line reason; the app builds a plain
// Google search link, so we never show invented products, prices or URLs.
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ALT_TYPES } from '../config';
import { alternativeSearchUrl } from '../debate/logic';
import { colors, radius, font } from '../theme';

export default function AlternativeCard({ alternative, itemName }) {
  const info = ALT_TYPES[alternative.type];
  if (!info) return null;
  const url = alternativeSearchUrl(itemName, alternative.type);

  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${info.label}. ${alternative.reason}. Opens a web search.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.emoji}>{info.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{info.label}</Text>
        {!!alternative.reason && <Text style={styles.reason}>{alternative.reason}</Text>}
      </View>
      <Text style={styles.link}>Search ↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 4,
  },
  emoji: { fontSize: 26 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  reason: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  link: { fontSize: font.small, fontWeight: '700', color: colors.primary },
});
