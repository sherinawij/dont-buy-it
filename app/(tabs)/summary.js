// "Your week": friendly stats for the last 7 days, all computed in src/calc.js from Firestore items.
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, StyleSheet } from 'react-native';
import { Card } from '../../src/components/ui';
import { subscribeItems } from '../../src/db';
import { formatMoney, weeklyStats } from '../../src/calc';
import { categoryInfo } from '../../src/config';
import { font } from '../../src/theme';
import { useStyles, useTheme } from '../../src/useTheme';

const TIME_LABELS = {
  morning: '🌅 Mornings',
  afternoon: '☀️ Afternoons',
  evening: '🌇 Evenings',
  night: '🌙 Late at night',
};

export default function Summary() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => subscribeItems(setItems, () => setLoadError(true)), []);

  if (!items) {
    return (
      <View style={styles.center}>
        {loadError ? (
          <Text style={styles.muted}>Couldn’t load your week. Check your connection.</Text>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  const s = weeklyStats(items);
  const anything = s.resisted + s.bought + s.debating > 0;

  if (!anything) {
    return (
      <View style={styles.center}>
        <Text style={styles.big}>🌱</Text>
        <Text style={styles.muted}>A quiet week! Nothing logged in the last 7 days.</Text>
      </View>
    );
  }

  const top = s.topCategory ? categoryInfo(s.topCategory) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.hero}>
        <Text style={styles.label}>Spending avoided this week</Text>
        <Text style={styles.money}>{formatMoney(s.savedThisWeek)}</Text>
        <Text style={styles.small}>From things you chose not to buy (self-reported).</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Your decisions</Text>
        <View style={styles.row}>
          <Stat value={s.resisted} label="Resisted" />
          <Stat value={s.bought} label="Bought" />
          <Stat value={s.debating} label="Still debating" />
        </View>
      </Card>

      <Card>
        <Text style={styles.label}>Sprout’s record</Text>
        <View style={styles.row}>
          <Stat value={s.sproutWins} label="🌱 Sprout won" />
          <Stat value={s.userWins} label="🙋 You won" />
        </View>
        <Text style={styles.small}>{recordLine(s.sproutWins, s.userWins)}</Text>
      </Card>

      {top && (
        <Card>
          <Text style={styles.label}>Most tempting</Text>
          <Text style={styles.value}>
            {top.emoji} {top.label}
          </Text>
        </Card>
      )}

      {s.peakTime && (
        <Card>
          <Text style={styles.label}>Peak temptation time</Text>
          <Text style={styles.value}>{TIME_LABELS[s.peakTime]}</Text>
          <Text style={styles.small}>That’s when you add the most things you want.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// A little Sprout commentary. Playful either way, never guilt-trippy.
function recordLine(sprout, you) {
  if (sprout === 0 && you === 0) return 'No debates finished yet. Sprout is stretching.';
  if (sprout > you) return 'Sprout is on a roll. Insufferably proud, honestly.';
  if (you > sprout) return 'You’re a tough negotiator. Sprout is taking notes.';
  return 'Dead even. Sprout demands a rematch.';
}

const makeStyles = (colors) => StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  hero: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  label: { fontSize: font.small, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  money: { fontSize: font.big + 8, fontWeight: '800', color: colors.primaryDark, marginVertical: 2 },
  value: { fontSize: font.title - 4, fontWeight: '800', color: colors.text, marginTop: 6 },
  small: { fontSize: font.small, color: colors.muted, marginTop: 6, lineHeight: 19 },
  row: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: font.big, fontWeight: '800', color: colors.primaryDark },
  statLabel: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  big: { fontSize: 56 },
  muted: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});
