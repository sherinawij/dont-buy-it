// The debate with Sprout — the heart of the app.
// Flow: user argues → /api/chat tags which rubric criteria the LATEST message supports →
// the app unions them into criteriaMet → once CONCEDE_AT are met, THE CODE (not the AI)
// makes Sprout concede with one extra call that returns alternatives.
// The two exits ("Don't buy it" / "Buy anyway") are always visible: Sprout persuades, never blocks.
import { useEffect, useRef, useState } from 'react';
import {
  FlatList, Image, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Sprout from '../../src/components/Sprout';
import LeafBurst from '../../src/components/LeafBurst';
import ConvictionMeter from '../../src/components/ConvictionMeter';
import AlternativeCard from '../../src/components/AlternativeCard';
import ChatBubble from '../../src/components/chat/ChatBubble';
import TypingDots from '../../src/components/chat/TypingDots';
import SuggestedReplies from '../../src/components/chat/SuggestedReplies';
import { Button, Card } from '../../src/components/ui';
import { chatWithSprout } from '../../src/api';
import { decideItem, getItem, getRecentHistory, getSettings, subscribeItems, updateItem } from '../../src/db';
import { getDraft } from '../../src/memory';
import { usePhoto } from '../../src/photos';
import { useKeyboardInset } from '../../src/useKeyboardInset';
import * as calc from '../../src/calc';
import { CANNED_LINES, FINAL_PLEA_TURN, categoryInfo } from '../../src/config';
import {
  buyOutcome, countUserTurns, hasEnoughToConcede, isFinalPleaTurn, moodFor, recentMessages, shouldShake,
  unionCriteria, validAlternatives,
} from '../../src/debate/logic';
import { colors, radius, font } from '../../src/theme';

const MAX_INPUT = 500; // the server rejects longer messages
const RESIST_LINE = 'YOU DID IT. I’M SO PROUD. I’M GROWING.';

// Firestore can wait a long time when offline; never let history block Sprout's reply.
const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise.catch(() => fallback), new Promise((r) => setTimeout(() => r(fallback), ms))]);

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Everything /api/chat needs. The server is stateless, so we send the full context each call.
async function buildChatBody({ item, settings, allItems, messages, criteriaMet, turn, flags }) {
  const price = calc.priceOf(item);
  const budget = settings.discretionaryBudget;
  // remainingBudget arrives with P4's calc.js; until then it's undefined and we simply omit it.
  const remaining =
    budget != null && calc.remainingBudget ? calc.remainingBudget(allItems, budget, Date.now()) : undefined;
  return {
    item: {
      name: item.name, category: item.category, price: item.price, estimatedPrice: item.estimatedPrice,
      link: item.link, essential: item.essential,
    },
    messages: recentMessages(messages),
    criteriaMet,
    turn,
    // undefined fields are dropped by JSON.stringify, so missing settings simply aren't sent.
    hoursOfWork: calc.hoursOfWork(price, settings.hourlyWage) ?? undefined,
    savingsGoal: settings.savingsGoal ?? undefined,
    goalAmount: settings.goalAmount ?? undefined,
    totalSaved: calc.totalSaved(allItems),
    remainingDiscretionaryBudget: remaining,
    history: await withTimeout(getRecentHistory(10), 2500, []),
    conceded: false,
    finalPlea: false,
    resumed: false,
    ...flags,
  };
}

export default function Debate() {
  const { id, resume } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const draft = getDraft(id); // first suggested replies (+ full photo), in memory only (absent when resuming)
  const storedPhoto = usePhoto(id); // small thumbnail kept on this phone only (src/photos.js)
  const photoUri = draft?.photoUri ?? storedPhoto;
  const { viewRef, inset: keyboardInset } = useKeyboardInset();

  const [item, setItem] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [messages, setMessages] = useState([]);
  const [criteriaMet, setCriteriaMet] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [conceded, setConceded] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [pleaDone, setPleaDone] = useState(false); // Sprout made its final plea and stopped arguing
  const [pleaBase, setPleaBase] = useState(0); // see isFinalPleaTurn: lets a resumed debate start a new round
  const [status, setStatus] = useState('debating'); // local copy so the UI reacts instantly
  const [shakeKey, setShakeKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const [settings, setSettings] = useState({});
  const [allItems, setAllItems] = useState([]);

  const listRef = useRef(null);
  const leaveTimer = useRef(null);
  const decidedRef = useRef(false); // set by the exits, so a late Sprout reply can't undo a decision

  // When the keyboard opens the chat area shrinks; keep the latest message in view.
  useEffect(() => {
    if (keyboardInset > 0) listRef.current?.scrollToEnd({ animated: true });
  }, [keyboardInset]);

  // Live catalog: used for Sprout's stage and the "spending avoided" total sent as context.
  // (Also kept in a ref so async code always sees the latest list, not a stale closure.)
  const allItemsRef = useRef([]);
  useEffect(() => subscribeItems((list) => { allItemsRef.current = list; setAllItems(list); }), []);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const price = item ? calc.priceOf(item) : 0;
  const hours = calc.hoursOfWork(price, settings.hourlyWage);
  const turn = countUserTurns(messages);
  const decided = status !== 'debating';
  // Input closes once there's nothing left to argue about. The exits stay regardless.
  const inputLocked = !item || item.essential || conceded || pleaDone || decided;

  const chatBody = (msgs, met, t, flags) =>
    buildChatBody({ item, settings, allItems: allItemsRef.current, messages: msgs, criteriaMet: met, turn: t, flags });

  // Save progress after every turn. Not awaited: offline writes queue up and sync later.
  const persist = (msgs, met) => updateItem(id, { messages: msgs, criteriaMet: met }).catch(() => {});

  const maybeShake = (reply, t) => shouldShake(reply, t) && setShakeKey((k) => k + 1);

  // ---------- Load the item (and resume the fight if asked) ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      const [it, s] = await Promise.all([getItem(id), getSettings().catch(() => ({}))]);
      if (!alive) return;
      if (!it) return setLoadError(true);

      // Normally Add saved Sprout's opening line; if not, use a canned one so the chat isn't empty.
      let msgs = it.messages?.length
        ? it.messages
        : [{ role: 'sprout', text: (it.essential ? CANNED_LINES.opening_essential : CANNED_LINES.opening_want)[0], mood: it.essential ? 'happy' : 'smug' }];
      const met = it.criteriaMet || [];
      const alreadyConceded = !it.essential && hasEnoughToConcede(met);
      const turns = countUserTurns(msgs);
      const resuming = resume === '1' && it.status === 'debating' && !it.essential;

      setItem(it);
      setSettings(s);
      setMessages(msgs);
      setCriteriaMet(met);
      setStatus(it.status);
      setConceded(alreadyConceded);
      if (resuming) {
        // Coming back after the final plea starts a fresh round of arguing.
        setPleaBase(turns >= FINAL_PLEA_TURN ? turns : 0);
      } else {
        setPleaDone(!alreadyConceded && turns >= FINAL_PLEA_TURN);
        setSuggested(draft?.suggestedReplies ?? []);
      }
      if (!resuming) return;

      // "You're BACK? For THIS?" (If Sprout had already conceded, it re-delivers alternatives.)
      setWaiting(true);
      // (State isn't updated yet inside this effect, so pass the freshly loaded values directly.)
      const body = await buildChatBody({
        item: it, settings: s, allItems: allItemsRef.current, messages: msgs, criteriaMet: met, turn: turns,
        flags: { resumed: true, conceded: alreadyConceded },
      });
      const res = await chatWithSprout(body);
      if (!alive || decidedRef.current) return;
      const resumedMood = moodFor({ essential: false, status: 'debating', conceded: alreadyConceded, waiting: false, criteriaMet: met, turn: turns });
      msgs = [...msgs, { role: 'sprout', text: res.reply, mood: resumedMood }];
      setMessages(msgs);
      setSuggested(alreadyConceded ? [] : res.suggestedReplies);
      if (alreadyConceded) setAlternatives(validAlternatives(res.alternatives));
      maybeShake(res.reply, turns);
      setWaiting(false);
      persist(msgs, met);
    })().catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- One user turn ----------
  async function send(raw) {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text || waiting || inputLocked) return;

    let msgs = [...messages, { role: 'user', text }];
    const t = countUserTurns(msgs);
    const finalPlea = isFinalPleaTurn(t, pleaBase);
    setMessages(msgs);
    setInput('');
    setSuggested([]);
    setWaiting(true);

    const res = await chatWithSprout(await chatBody(msgs, criteriaMet, t, { finalPlea }));
    const met = unionCriteria(criteriaMet, res.criteriaHit);
    // The user tapped an exit while Sprout was typing: keep their argument, drop Sprout's reply.
    if (decidedRef.current) return persist(msgs, met);
    setCriteriaMet(met); // the meter fills now, even before Sprout answers

    if (hasEnoughToConcede(met)) {
      // THE CODE DECIDES: threshold crossed → ask Sprout for its (reluctant) concession + alternatives.
      // We skip the regular reply so Sprout's answer to this message IS the concession.
      // Sprout panics while we wait (see moodFor).
      const c = await chatWithSprout(await chatBody(msgs, met, t, { conceded: true }));
      if (decidedRef.current) return persist(msgs, met);
      msgs = [...msgs, { role: 'sprout', text: c.reply, mood: 'defeated' }];
      setConceded(true);
      setAlternatives(validAlternatives(c.alternatives));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      maybeShake(c.reply, t);
    } else {
      const replyMood = moodFor({ essential: false, status: 'debating', conceded: false, waiting: false, criteriaMet: met, turn: t });
      msgs = [...msgs, { role: 'sprout', text: res.reply, mood: replyMood }];
      if (finalPlea) setPleaDone(true);
      else setSuggested(res.suggestedReplies);
      maybeShake(res.reply, t);
    }
    setMessages(msgs);
    setWaiting(false);
    persist(msgs, met);
  }

  // ---------- The two exits ----------
  function dontBuy() {
    decidedRef.current = true;
    setStatus('resisted');
    setWaiting(false);
    setMessages((m) => [...m, { role: 'sprout', text: RESIST_LINE, mood: 'ecstatic' }]);
    setBurstKey((k) => k + 1);
    setShakeKey((k) => k + 1); // happy wiggle
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    decideItem(id, { status: 'resisted', outcome: 'sprout_won' }).catch(() => {});
  }

  function buyAnyway() {
    decidedRef.current = true;
    setStatus('bought');
    setWaiting(false);
    // ONE dramatic line, then Sprout lets it go completely. Never any guilt for a genuine need.
    const line = item.essential ? 'Good call. Take care of yourself! 💚' : 'I… I need a moment. *faints gracefully*';
    setMessages((m) => [...m, { role: 'sprout', text: line, mood: item.essential ? 'happy' : 'defeated' }]);
    decideItem(id, { status: 'bought', outcome: buyOutcome(item, conceded) }).catch(() => {});
    leaveTimer.current = setTimeout(goBack, 1500);
  }

  // ---------- Render ----------
  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>Sprout couldn’t find this item. It may still be syncing — try again in a moment.</Text>
        <Button title="Back home" variant="secondary" onPress={goBack} style={{ marginTop: 16 }} />
      </View>
    );
  }
  if (!item) {
    return (
      <View style={styles.center}>
        <Sprout stage={1} mood="nervous" size={90} />
        <Text style={styles.note}>Sprout is bracing itself…</Text>
      </View>
    );
  }

  const lockNote = decided
    ? null
    : item.essential
      ? 'No debate needed for genuine needs.'
      : conceded
        ? 'Sprout gave up. Peek at the options above, then decide.'
        : pleaDone
          ? 'Sprout has said everything. Your call.'
          : null;

  const stage = calc.plantStageFor(calc.totalSaved(allItems), calc.positiveDecisions(allItems));
  const mood = moodFor({ essential: item.essential, status, conceded, waiting, criteriaMet, turn });
  const priceText = price > 0 ? `${calc.formatMoney(price)}${item.price == null ? ' (estimate)' : ''}` : 'Price unknown';

  const typing = keyboardInset > 0;

  // Keyboard: pad the screen by exactly the part the keyboard covers, so the input sits right above it.
  return (
    <View ref={viewRef} collapsable={false} style={{ flex: 1, paddingBottom: keyboardInset }}>
      {/* Item header (hidden while typing, so the chat keeps its space above the keyboard) */}
      {!typing && (
        <View style={styles.header}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.thumb} accessibilityLabel="Photo of the item" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmoji]}>
              <Text style={{ fontSize: 26 }}>{categoryInfo(item.category).emoji}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {priceText}
              {hours != null ? `  ·  ≈ ${hours} ${hours === 1 ? 'hour' : 'hours'} of work` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Sprout + conviction meter */}
      <View style={styles.sproutRow}>
        <View>
          <Sprout stage={stage} mood={mood} size={typing ? 56 : 84} shakeKey={shakeKey} />
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LeafBurst trigger={burstKey} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          {item.essential ? (
            <View style={styles.essentialPill}>
              <Text style={styles.essentialText}>💚 Genuine need — approved</Text>
            </View>
          ) : (
            <ConvictionMeter criteriaMet={criteriaMet} />
          )}
        </View>
      </View>

      {/* Chat */}
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chat}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item: m }) => (
          <ChatBubble role={m.role} text={m.text} mood={m.mood ?? (item.essential ? 'happy' : 'smug')} stage={stage} />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          <>
            {waiting && <TypingDots mood={mood} stage={stage} />}
            {alternatives.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.altTitle}>Sprout’s (grudging) better ideas</Text>
                {alternatives.map((a) => (
                  <AlternativeCard
                    key={a.type}
                    alternative={a}
                    itemName={item.name}
                    category={item.category}
                    photoUri={photoUri}
                  />
                ))}
              </View>
            )}
          </>
        }
      />

      {/* Reply area */}
      {!inputLocked && (
        <>
          <SuggestedReplies replies={suggested} onPick={send} disabled={waiting} />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Make your case…"
              placeholderTextColor={colors.muted}
              maxLength={MAX_INPUT}
              multiline
              accessibilityLabel="Your argument"
            />
            <Pressable
              onPress={() => send(input)}
              disabled={waiting || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={({ pressed }) => [styles.send, (pressed || waiting || !input.trim()) && { opacity: 0.5 }]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </>
      )}
      {lockNote && <Text style={[styles.note, { paddingHorizontal: 16, paddingTop: 6 }]}>{lockNote}</Text>}

      {/* Exits — always visible while the item is undecided */}
      <View style={[styles.footer, { paddingBottom: typing ? 8 : Math.max(insets.bottom, 12) }]}>
        {status === 'debating' && (
          <View style={styles.exits}>
            <Button title="Don't buy it" onPress={dontBuy} style={{ flex: 1 }} />
            <Button title="Buy anyway" variant="secondary" onPress={buyAnyway} style={{ flex: 1 }} />
          </View>
        )}
        {status === 'resisted' && (
          <Card style={styles.win}>
            <Text style={styles.winTitle}>Spending avoided: {calc.formatMoney(price)} 🌱</Text>
            <Text style={styles.note}>Added to your jar. It’s money you chose not to spend, not a transfer.</Text>
            <View style={styles.exits}>
              <Button title="Share this win" onPress={() => router.replace(`/achievement/skipped_${id}`)} style={{ flex: 1 }} />
              <Button title="Back home" variant="secondary" onPress={goBack} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 4 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.primarySoft },
  thumbEmoji: { alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 20, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  sproutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  essentialPill: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  essentialText: { fontSize: font.small, fontWeight: '700', color: colors.primaryDark },
  chat: { padding: 16, paddingBottom: 8 },
  altTitle: { fontSize: font.small, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 4 },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: font.body,
    color: colors.text,
  },
  send: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 16 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: font.body },
  note: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 10 },
  exits: { flexDirection: 'row', gap: 10 },
  win: { gap: 10 },
  winTitle: { fontSize: font.body, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
});
