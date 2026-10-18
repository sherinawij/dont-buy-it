// Friends: search by username, send / accept / decline / cancel requests, remove friends.
// Needs an account with a username. Everything is stored in Firestore (friendships/...), not on the phone.
// Owner: P1 (social features).
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Card } from '../src/components/ui';
import { useAuthUser } from '../src/auth';
import { getMyProfile } from '../src/profile';
import {
  acceptFriendRequest, friendsErrorMessage, removeFriendship, searchUsers, sendFriendRequest, subscribeFriendships,
} from '../src/friends';
import { colors, font, radius } from '../src/theme';

export default function FriendsScreen() {
  const { guest } = useAuthUser();
  const [hasProfile, setHasProfile] = useState(undefined); // undefined = checking

  useEffect(() => {
    if (guest) return;
    getMyProfile().then((p) => setHasProfile(Boolean(p))).catch(() => setHasProfile(false));
  }, [guest]);

  if (guest) {
    return (
      <Gate
        text="Friends need an account, so people can find you by username. Your progress on this phone comes with you."
        button="Create an account"
      />
    );
  }
  if (hasProfile === undefined) return <Loading />;
  if (!hasProfile) return <Gate text="Pick a username first so friends can find you." button="Pick a username" />;
  return <Friends />;
}

function Gate({ text, button }) {
  return (
    <View style={styles.center}>
      <Text style={styles.body}>{text}</Text>
      <Button title={button} onPress={() => router.push('/profile')} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const Loading = () => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

function Friends() {
  const [rows, setRows] = useState(null); // my friendships, live; null = loading
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState({}); // uid → true while an action runs
  const [message, setMessage] = useState('');
  const searchSeq = useRef(0);

  useEffect(
    () =>
      subscribeFriendships(
        (list) => {
          setRows(list);
          setLoadError(false);
        },
        () => setLoadError(true)
      ),
    []
  );

  // Search as you type (small delay so we don't query on every keystroke).
  useEffect(() => {
    const seq = ++searchSeq.current;
    if (search.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchUsers(search)
        .then((r) => seq === searchSeq.current && setResults(r))
        .catch(() => seq === searchSeq.current && setMessage('Search failed. Check your connection.'))
        .finally(() => seq === searchSeq.current && setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Run one action for one person, with a busy flag and a friendly message.
  async function act(uid, fn, messages) {
    setBusy((b) => ({ ...b, [uid]: true }));
    setMessage('');
    try {
      const outcome = await fn(uid);
      if (messages?.[outcome]) setMessage(messages[outcome]);
    } catch (e) {
      setMessage(friendsErrorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [uid]: false }));
    }
  }

  const add = (uid) =>
    act(uid, sendFriendRequest, {
      sent: 'Request sent!',
      'already-sent': 'You already sent a request.',
      accepted: 'They had already asked you, so you’re now friends!',
      'already-friends': 'You’re already friends.',
    });
  const accept = (uid) =>
    act(uid, acceptFriendRequest, {
      accepted: 'You’re now friends!',
      'already-friends': 'You’re already friends.',
      gone: 'That request was cancelled.',
    });
  const decline = (uid) => act(uid, removeFriendship);
  const remove = (row) =>
    Alert.alert('Remove friend?', `${row.displayName} will no longer see you on their leaderboard, and you won’t see them.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => act(row.uid, removeFriendship) },
    ]);

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Couldn’t load your friends. Check your connection and try again.</Text>
      </View>
    );
  }
  if (!rows) return <Loading />;

  const byUid = Object.fromEntries(rows.map((r) => [r.uid, r]));
  const incoming = rows.filter((r) => r.direction === 'incoming');
  const outgoing = rows.filter((r) => r.direction === 'outgoing');
  const friends = rows.filter((r) => r.direction === 'friends');

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.note}>
        <Text style={styles.noteText}>
          Friends see only your display name, username and total spending avoided on the leaderboard. Never your
          items, prices or chats with Sprout.
        </Text>
      </Card>

      {/* Search */}
      <Text style={styles.section}>Find people</Text>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by username"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
      />
      {searching && <ActivityIndicator color={colors.primary} />}
      {!searching && search.trim().length >= 2 && results.length === 0 && (
        <Text style={styles.muted}>No one found with a username starting with “{search.trim()}”.</Text>
      )}
      {results.map((p) => {
        const rel = byUid[p.uid];
        return (
          <PersonRow key={p.uid} person={p}>
            {!rel && <SmallButton title="Add" onPress={() => add(p.uid)} disabled={busy[p.uid]} />}
            {rel?.direction === 'outgoing' && <Text style={styles.tag}>Requested</Text>}
            {rel?.direction === 'incoming' && <SmallButton title="Accept" onPress={() => accept(p.uid)} disabled={busy[p.uid]} />}
            {rel?.direction === 'friends' && <Text style={styles.tag}>Friends ✓</Text>}
          </PersonRow>
        );
      })}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <>
          <Text style={styles.section}>Requests for you</Text>
          {incoming.map((r) => (
            <PersonRow key={r.uid} person={r}>
              <SmallButton title="Accept" onPress={() => accept(r.uid)} disabled={busy[r.uid]} />
              <SmallButton title="Decline" variant="secondary" onPress={() => decline(r.uid)} disabled={busy[r.uid]} />
            </PersonRow>
          ))}
        </>
      )}

      {/* Friends */}
      <Text style={styles.section}>Your friends</Text>
      {friends.length === 0 ? (
        <Text style={styles.muted}>No friends yet. Search for someone’s username above.</Text>
      ) : (
        friends.map((r) => (
          <PersonRow key={r.uid} person={r}>
            <SmallButton title="Remove" variant="secondary" onPress={() => remove(r)} disabled={busy[r.uid]} />
          </PersonRow>
        ))
      )}

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <>
          <Text style={styles.section}>Waiting for a reply</Text>
          {outgoing.map((r) => (
            <PersonRow key={r.uid} person={r}>
              <SmallButton title="Cancel" variant="secondary" onPress={() => decline(r.uid)} disabled={busy[r.uid]} />
            </PersonRow>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PersonRow({ person, children }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{person.displayName}</Text>
        <Text style={styles.muted} numberOfLines={1}>@{person.username}</Text>
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function SmallButton({ title, onPress, disabled, variant = 'primary' }) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.small,
        primary ? { backgroundColor: colors.primary } : { borderWidth: 1.5, borderColor: colors.primary },
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.smallText, { color: primary ? '#fff' : colors.primaryDark }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  body: { fontSize: font.body, color: colors.text, textAlign: 'center', lineHeight: 24 },
  note: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  noteText: { fontSize: font.small, color: colors.primaryDark, lineHeight: 20 },
  section: { fontSize: font.body, fontWeight: '800', color: colors.text, marginTop: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  name: { fontSize: font.body, fontWeight: '700', color: colors.text },
  muted: { fontSize: font.small, color: colors.muted },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  small: { borderRadius: radius.lg, paddingVertical: 8, paddingHorizontal: 14 },
  smallText: { fontSize: font.small, fontWeight: '700' },
  tag: { fontSize: font.small, fontWeight: '700', color: colors.primaryDark },
  message: { fontSize: font.small + 1, color: colors.primaryDark, textAlign: 'center' },
});
