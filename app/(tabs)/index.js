// Home: Sprout (the hero), the "spending avoided" jar, and the live catalog.
// Everything shown is derived from Firestore items, so it updates live and survives restarts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Sprout from '../../src/components/Sprout';
import MoneyPop from '../../src/components/MoneyPop';
import LeafBurst from '../../src/components/LeafBurst';
import NightSky from '../../src/components/NightSky';
import ItemCard from '../../src/components/ItemCard';
import DebatingCard from '../../src/components/DebatingCard';
import { Button, Card } from '../../src/components/ui';
import { getSettings, subscribeItems } from '../../src/db';
import { formatMoney, goalProgress, remainingBudget, totalSaved } from '../../src/calc';
import { getSproutState } from '../../src/sproutState';
import { HOME_LINES } from '../../src/config';
import { font, radius } from '../../src/theme';
import { useStyles, useTheme } from '../../src/useTheme';

const PANIC_MS = 600; // how long Sprout panics before the Add screen opens

export default function Home() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [items, setItems] = useState(null); // null = still loading
  const [loadError, setLoadError] = useState(false);
  const [settings, setSettings] = useState({});
  const [now, setNow] = useState(Date.now());
  const [focused, setFocused] = useState(true);
  const [panicking, setPanicking] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [pop, setPop] = useState({ amount: 0, trigger: 0 });

  // Live catalog from Firestore.
  useEffect(
    () =>
      subscribeItems(
        (list) => {
          setItems(list);
          setLoadError(false);
        },
        () => setLoadError(true)
      ),
    []
  );

  // Each time Home comes back into view: reload settings (they may have changed),
  // and refresh `now` every 30s so recent-event moods expire after the reaction window.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setPanicking(false);
      setNow(Date.now());
      getSettings().then(setSettings).catch(() => {});
      const tick = setInterval(() => setNow(Date.now()), 30 * 1000);
      return () => {
        setFocused(false);
        clearInterval(tick);
      };
    }, [])
  );

  const total = items ? totalSaved(items) : null;
  const sprout = useMemo(() => (items ? getSproutState(items, now) : null), [items, now]);

  // "+$X" pop + leaf burst + haptic when the jar grows while Home is on screen.
  // The ref remembers the total Home last showed, so returning from a resisted debate pops once.
  const shownTotal = useRef(null);
  useEffect(() => {
    if (total == null || !focused) return;
    if (shownTotal.current != null && total > shownTotal.current) {
      const added = total - shownTotal.current;
      setPop((p) => ({ amount: added, trigger: p.trigger + 1 }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    shownTotal.current = total;
  }, [total, focused]);

  // Gentle bounce when Sprout grows a stage, or a new milestone shows up (e.g. after a restart).
  const lastStage = useRef(null);
  const seenMilestone = useRef(null);
  useEffect(() => {
    if (!sprout || !focused) return;
    const grew = lastStage.current != null && sprout.stage > lastStage.current;
    const newMilestone = sprout.milestoneKey && sprout.milestoneKey !== seenMilestone.current;
    if (grew || newMilestone) setBounceKey((k) => k + 1);
    lastStage.current = sprout.stage;
    if (sprout.milestoneKey) seenMilestone.current = sprout.milestoneKey;
  }, [sprout?.stage, sprout?.milestoneKey, focused]);

  // Sprout visibly panics for a moment, then the Add screen opens.
  const onWantToBuy = () => {
    if (panicking) return;
    setPanicking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => router.push('/add'), PANIC_MS);
  };

  if (!items) {
    return (
      <View style={styles.center}>
        {loadError ? (
          <Text style={styles.muted}>Couldn’t load your catalog. Check your connection and try again.</Text>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  const mood = panicking ? 'panicking' : sprout.mood;
  const line = panicking ? HOME_LINES.panicking[0] : sprout.line;
  const progress = goalProgress(total, settings.goalAmount);
  const left = remainingBudget(items, settings.discretionaryBudget, now);
  const debating = items.filter((i) => i.status === 'debating');
  const decided = items.filter((i) => i.status !== 'debating');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Hero: Sprout + speech bubble */}
      <View style={styles.hero}>
        <NightSky />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{line}</Text>
          <View style={styles.bubbleTail} />
        </View>
        <Sprout stage={sprout.stage} mood={mood} size={200} bounceKey={bounceKey} />
      </View>

      {/* The jar: self-reported spending avoided, never "money deposited" */}
      <Card>
        <Text style={styles.label}>Spending avoided</Text>
        <View>
          <Text style={styles.total}>{formatMoney(total)}</Text>
          <View style={styles.popLayer} pointerEvents="none">
            <MoneyPop amount={pop.amount} trigger={pop.trigger} />
            <LeafBurst trigger={pop.trigger} />
          </View>
        </View>
        <Text style={styles.small}>From things you chose not to buy (self-reported).</Text>

        {progress != null && (
          <View style={styles.goal}>
            <Text style={styles.goalText}>
              {formatMoney(Math.min(total, settings.goalAmount))} of {formatMoney(settings.goalAmount)} could go toward{' '}
              <Text style={{ fontWeight: '700' }}>{settings.savingsGoal || 'your goal'}</Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        )}

        {left != null && (
          <Text style={[styles.small, { marginTop: 10 }]}>
            {left >= 0 ? `≈ ${formatMoney(left)} left this month` : `≈ ${formatMoney(-left)} over this month’s budget`} · based
            only on purchases logged in this app
          </Text>
        )}
      </Card>

      <Button title="I want to buy something…" onPress={onWantToBuy} style={styles.bigButton} />

      {/* Open debates first, so it's easy to pick the fight back up */}
      {debating.length > 0 && (
        <>
          <Text style={styles.section}>Still debating</Text>
          {debating.map((item) => (
            <DebatingCard key={item.id} item={item} onResume={() => router.push(`/debate/${item.id}?resume=1`)} />
          ))}
        </>
      )}

      {(decided.length > 0 || items.length === 0) && <Text style={styles.section}>Your catalog</Text>}
      {items.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet 🌱</Text>
          <Text style={styles.muted}>Tempted by something? Tap the big button and let Sprout weigh in first.</Text>
        </Card>
      ) : (
        decided.map((item) => <ItemCard key={item.id} item={item} />)
      )}
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  // Mint panel on Greenhouse, deep green night on Midnight Garden.
  hero: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.hero,
    overflow: 'hidden',
  },
  bubble: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: '90%',
  },
  bubbleText: { fontSize: font.body, color: colors.text, textAlign: 'center', lineHeight: 23 },
  // A small rotated square peeking out under the bubble, pointing at Sprout.
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 14,
    height: 14,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  label: { fontSize: font.small, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  total: { fontSize: font.big + 8, fontWeight: '800', color: colors.primaryDark, marginVertical: 2 },
  popLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  small: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  goal: { marginTop: 14, gap: 8 },
  goalText: { fontSize: font.small + 1, color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.leaf },
  bigButton: { paddingVertical: 20 },
  section: { fontSize: font.title - 4, fontWeight: '800', color: colors.text, marginTop: 10 },
  empty: { alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
});
