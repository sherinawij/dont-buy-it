// One row in "Your catalog". Photo-free on purpose: photos are never stored, so we show a category emoji.
import { Pressable, Text, View, StyleSheet } from 'react-native';
import StatusPill from './StatusPill';
import { categoryInfo } from '../config';
import { formatMoney } from '../calc';
import { colors, font, radius } from '../theme';

// onPress is only passed for items that can be reopened (still debating).
export default function ItemCard({ item, onPress }) {
  const { emoji, label } = categoryInfo(item.category);
  // "≈" marks Sprout's estimate when the user didn't type a price.
  const price = item.price != null ? formatMoney(item.price) : item.estimatedPrice != null ? `≈ ${formatMoney(item.estimatedPrice)}` : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Continue the debate with Sprout' : undefined}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.icon}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>
          {[price, item.essential ? 'Essential' : label].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <StatusPill status={item.status} />
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
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  middle: { flex: 1, gap: 2 },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  meta: { fontSize: font.small, color: colors.muted },
});
