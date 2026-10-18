// One cheaper / lower-waste option Sprout pushes after conceding.
// The server only picks a TYPE (from a fixed list) + a one-line reason. The card shows the user's own
// photo of the item with a badge ("♻️ Used"), and opens a search the app builds itself (Google Shopping
// for things to buy, so the user sees real listings with real photos and prices). No invented products or URLs.
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ALT_TYPES, categoryInfo } from '../config';
import { alternativeSearchUrl, isShoppable } from '../debate/logic';
import { radius, font } from '../theme';
import { useStyles } from '../useTheme';

export default function AlternativeCard({ alternative, itemName, category, photoUri }) {
  const styles = useStyles(makeStyles);
  const info = ALT_TYPES[alternative.type];
  if (!info) return null;
  const url = alternativeSearchUrl(itemName, alternative.type);
  const cta = isShoppable(alternative.type) ? 'Shop online' : 'Find near me';

  return (
    <Pressable
      onPress={() => Linking.openURL(url).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${info.label}. ${alternative.reason}. ${cta}, opens a web search.`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      {/* Image tile: the user's photo (or category emoji) with the alternative's badge on top */}
      <View style={styles.tile}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.tileEmoji}>{categoryInfo(category).emoji}</Text>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{info.emoji}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{info.label}</Text>
        {!!alternative.reason && <Text style={styles.reason} numberOfLines={3}>{alternative.reason}</Text>}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{cta} ↗</Text>
        </View>
      </View>
    </Pressable>
  );
}

const TILE = 84;

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginVertical: 5,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%', borderRadius: radius.sm },
  tileEmoji: { fontSize: 38 },
  badge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 18 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  reason: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ctaText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
});
