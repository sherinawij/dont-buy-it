// An item still being argued over, in Home's "Still debating" section. Resume reopens the debate,
// and Sprout picks the fight back up. The whole card is the button, so the tap target is large.
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { categoryInfo } from '../config';
import { formatMoney } from '../calc';
import { usePhoto } from '../photos';
import { font, radius } from '../theme';
import { useStyles } from '../useTheme';

export default function DebatingCard({ item, onResume }) {
  const styles = useStyles(makeStyles);
  const photo = usePhoto(item.id);
  const price = item.price != null ? formatMoney(item.price) : item.estimatedPrice != null ? `≈ ${formatMoney(item.estimatedPrice)}` : '';

  return (
    <Pressable
      onPress={onResume}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. Resume the debate with Sprout`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.icon}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <Text style={styles.emoji}>{categoryInfo(item.category).emoji}</Text>
        )}
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[price, 'Sprout is waiting…'].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.resume}>
        <Text style={styles.resumeText}>Resume</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.debatingBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.debatingBorder,
    padding: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  photo: { width: '100%', height: '100%', borderRadius: radius.sm },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.muted },
  resume: { backgroundColor: colors.resumeBg, borderRadius: 999, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
  resumeText: { fontSize: font.small + 1, fontWeight: '800', color: colors.onResume },
});
