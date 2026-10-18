// Friends-only leaderboard: you + accepted friends, ranked by total spending avoided (self-reported).
// The ranking is computed on the server from each person's "Don't buy it" decisions; friends only
// ever receive one number per person. Refreshes when opened and on pull-to-refresh.
// Owner: P1 (social features).
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, Card } from '../src/components/ui';
import { useAuthUser } from '../src/auth';
import { fetchLeaderboard } from '../src/leaderboard';
import { formatMoney } from '../src/calc';
import { font, radius } from '../src/theme';
import { useStyles, useTheme } from '../src/useTheme';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { guest } = useAuthUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await fetchLeaderboard());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Fetch fresh numbers every time the screen comes into view.
  useFocusEffect(
    useCallback(() => {
      if (!guest) load();
    }, [guest, load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (guest) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>The leaderboard needs an account, so friends can find you.</Text>
        <Button title="Create an account" onPress={() => router.push('/profile')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  const onlyMe = data && data.rows.length <= 1;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Card style={styles.note}>
        <Text style={styles.noteTitle}>Total spending avoided · all time</Text>
        <Text style={styles.noteText}>
          The price of everything each person chose not to buy (self-reported, not money in a bank). Friends see
          only your display name, username and this total. Never your items.
        </Text>
      </Card>

      {error ? (
        <Card style={{ gap: 10, alignItems: 'center' }}>
          <Text style={styles.body}>{error}</Text>
          <Button title="Try again" variant="secondary" onPress={load} />
        </Card>
      ) : !data ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          {data.rows.map((r) => (
            <View key={`${r.rank}-${r.username}-${r.isMe}`} style={[styles.row, r.isMe && styles.me]}>
              <Text style={styles.rank}>{MEDALS[r.rank] ?? `#${r.rank}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.displayName}{r.isMe ? ' (you)' : ''}
                </Text>
                {r.username ? <Text style={styles.muted} numberOfLines={1}>@{r.username}</Text> : null}
              </View>
              <Text style={styles.amount}>{formatMoney(r.amount)}</Text>
            </View>
          ))}
          {onlyMe && (
            <Card style={{ gap: 10, alignItems: 'center' }}>
              <Text style={styles.body}>It’s just you so far. Add friends to see who resists best.</Text>
              <Button title="👥 Find friends" onPress={() => router.push('/friends')} />
            </Card>
          )}
          <Text style={styles.footer}>Pull down to refresh.</Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  body: { fontSize: font.body, color: colors.text, textAlign: 'center', lineHeight: 24 },
  note: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft, gap: 4 },
  noteTitle: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark },
  noteText: { fontSize: font.small, color: colors.primaryDark, lineHeight: 20 },
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
  me: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  rank: { fontSize: 22, minWidth: 40, textAlign: 'center', fontWeight: '800', color: colors.text },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.small, color: colors.muted },
  amount: { fontSize: font.body + 1, fontWeight: '800', color: colors.primary },
  footer: { fontSize: font.small, color: colors.muted, textAlign: 'center', marginTop: 6 },
});
