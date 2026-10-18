// "Your wins": every achievement card the user has earned, newest first.
// Derived live from the catalog (src/achievements.js), so nothing extra is stored.
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Card } from '../src/components/ui';
import { subscribeItems } from '../src/db';
import { deriveAchievements } from '../src/achievements';
import { formatMoney } from '../src/calc';
import { colors, font, radius } from '../src/theme';

const TYPE_EMOJI = { skipped: '🌱', slept_on_it: '😴', milestone: '🌸', alternative: '♻️' };

export default function Achievements() {
  const [items, setItems] = useState(null);
  useEffect(() => subscribeItems(setItems, () => setItems([])), []);

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const wins = deriveAchievements(items);

  return (
    <FlatList
      data={wins}
      keyExtractor={(a) => a.key}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>No wins yet 🌱</Text>
          <Text style={styles.muted}>Next time you tap “Don’t buy it”, your win shows up here, ready to share.</Text>
        </Card>
      }
      renderItem={({ item: a }) => (
        <Pressable
          onPress={() => router.push(`/achievement/${a.key}`)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.emoji}>{TYPE_EMOJI[a.type]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {a.type === 'milestone' ? a.detail : a.itemName}
              {a.amountAvoided != null ? ` · ${formatMoney(a.amountAvoided)} avoided` : ''}
            </Text>
          </View>
          <Text style={styles.share}>Share ›</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  emoji: { fontSize: 28 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  share: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  empty: { alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
});
