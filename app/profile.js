// Profile: who you are, how you're doing, and where to go next.
// - Everyone: your Sprout, your stats (all computed from your own items), shortcuts.
// - Accounts: display name + @username (editable), friends, leaderboard, log out.
// - Guests: the same stats, plus an invitation to create an account (progress comes along).
// Owner: P1 (social features).
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import Sprout from '../src/components/Sprout';
import { Button, Card } from '../src/components/ui';
import { signOutUser, useAuthUser } from '../src/auth';
import {
  getMyProfile, profileErrorMessage, saveProfile, USERNAME_RULE, validateDisplayName, validateUsername,
} from '../src/profile';
import { subscribeItems } from '../src/db';
import { subscribeFriendships } from '../src/friends';
import { formatMoney, plantStageFor, positiveDecisions, totalSaved } from '../src/calc';
import { deriveAchievements, STAGE_NAMES } from '../src/achievements';
import { font, radius } from '../src/theme';
import { useStyles, useTheme } from '../src/useTheme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { user, guest } = useAuthUser();
  const [items, setItems] = useState(null); // my catalog, live (null = loading)
  useEffect(() => subscribeItems(setItems, () => setItems([])), []);

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return guest ? <GuestProfile items={items} /> : <AccountProfile key={user.uid} email={user.email} items={items} />;
}

// ---------- Stats: one place, same math as Home (calc.js) and the share cards ----------
function statsFor(items) {
  const avoided = totalSaved(items);
  const stage = plantStageFor(avoided, positiveDecisions(items));
  return {
    avoided,
    resisted: items.filter((i) => i.status === 'resisted').length,
    stage,
    wins: deriveAchievements(items).length,
  };
}

function Hero({ stage, title, subtitle, children }) {
  const styles = useStyles(makeStyles);
  return (
    <Card style={styles.hero}>
      <Sprout stage={stage} mood="happy" size={110} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.heroTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.handle} numberOfLines={1}>{subtitle}</Text> : null}
        {children}
      </View>
    </Card>
  );
}

function StatsGrid({ stats, friends }) {
  const styles = useStyles(makeStyles);
  const tiles = [
    { label: 'Spending avoided', value: formatMoney(stats.avoided) },
    { label: 'Said no to', value: `${stats.resisted} ${stats.resisted === 1 ? 'item' : 'items'}` },
    { label: 'Sprout is', value: STAGE_NAMES[stats.stage] },
    { label: friends == null ? 'Wins' : 'Friends', value: friends == null ? String(stats.wins) : String(friends) },
  ];
  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile}>
          <Text style={styles.tileValue} numberOfLines={1}>{t.value}</Text>
          <Text style={styles.tileLabel}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

function LinkRow({ emoji, title, detail, badge, onPress }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
      <Text style={styles.linkEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.linkTitle}>{title}</Text>
        {detail ? <Text style={styles.small}>{detail}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ---------- Guests ----------
function GuestProfile({ items }) {
  const styles = useStyles(makeStyles);
  const stats = statsFor(items);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Hero stage={stats.stage} title="Guest" subtitle="Your progress lives on this phone" />
      <StatsGrid stats={stats} />

      <Card style={styles.invite}>
        <Text style={styles.inviteTitle}>Make it yours 🌱</Text>
        <Text style={styles.body}>
          Create an account to add friends and see a friends-only leaderboard. Everything above comes with you.
        </Text>
        <Button title="Create account" onPress={() => router.push('/auth?mode=register')} />
        <Button title="I already have an account" variant="secondary" onPress={() => router.push('/auth?mode=signin')} />
      </Card>

      <View style={styles.links}>
        <LinkRow emoji="🏆" title="Your wins" detail="Shareable cards for good decisions" onPress={() => router.push('/achievements')} />
        <LinkRow emoji="⚙️" title="Settings" detail="Wage, savings goal, budget" onPress={() => router.push('/settings')} />
      </View>
    </ScrollView>
  );
}

// ---------- Accounts ----------
function AccountProfile({ email, items }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not set up yet
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [friends, setFriends] = useState(null); // { count, incoming } once loaded

  function load() {
    setLoadError(false);
    getMyProfile()
      .then((p) => {
        setProfile(p);
        if (!p) setEditing(true); // first time: pick a username straight away
      })
      .catch(() => setLoadError(true));
  }
  useEffect(load, []);

  // Friend count + pending requests (badge). Failures just hide the numbers.
  useEffect(
    () =>
      subscribeFriendships(
        (rows) => setFriends({
          count: rows.filter((r) => r.direction === 'friends').length,
          incoming: rows.filter((r) => r.direction === 'incoming').length,
        }),
        () => setFriends(null)
      ),
    []
  );

  function logOut() {
    Alert.alert('Log out?', 'Your progress stays in your account. This phone will start a fresh guest session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          if (router.canDismiss()) router.dismissAll(); // land on Home after switching
          await signOutUser().catch(() => Alert.alert('Couldn’t log out', 'Check your connection and try again.'));
        },
      },
    ]);
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>Couldn’t load your profile. Check your connection.</Text>
        <Button title="Try again" variant="secondary" onPress={load} />
      </View>
    );
  }
  if (profile === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const stats = statsFor(items);
  const settingUp = profile === null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Hero
          stage={stats.stage}
          title={settingUp ? 'Welcome! 🌱' : profile.displayName}
          subtitle={settingUp ? 'Pick a username so friends can find you' : `@${profile.username}`}
        >
          {!settingUp && !editing && (
            <Pressable onPress={() => setEditing(true)} accessibilityRole="button" hitSlop={8} style={styles.editChip}>
              <Text style={styles.editChipText}>✏️ Edit profile</Text>
            </Pressable>
          )}
        </Hero>

        {editing && (
          <EditProfile
            initial={profile}
            onSaved={(p) => {
              setProfile(p);
              setEditing(false);
            }}
            onCancel={settingUp ? null : () => setEditing(false)}
          />
        )}

        {!settingUp && (
          <>
            <StatsGrid stats={stats} friends={friends?.count ?? null} />

            <View style={styles.links}>
              <LinkRow
                emoji="👥"
                title="Friends"
                detail={friends?.incoming ? 'Someone wants to be your friend' : 'Find people by username'}
                badge={friends?.incoming || null}
                onPress={() => router.push('/friends')}
              />
              <LinkRow emoji="🏆" title="Leaderboard" detail="You vs. friends: spending avoided" onPress={() => router.push('/leaderboard')} />
              <LinkRow
                emoji="🌱"
                title="Your wins"
                detail={`${stats.wins} ${stats.wins === 1 ? 'card' : 'cards'} to share`}
                onPress={() => router.push('/achievements')}
              />
              <LinkRow emoji="⚙️" title="Settings" detail="Wage, savings goal, budget" onPress={() => router.push('/settings')} />
            </View>

            <Card style={styles.privacy}>
              <Text style={styles.small}>
                Friends can see your display name, username and total spending avoided. Never your items, prices or
                chats with Sprout. Signed in as {email} (only you can see this).
              </Text>
            </Card>
          </>
        )}

        <Button title="Log out" variant="secondary" onPress={logOut} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Username + display name form. Usernames are unique (any capitalisation), enforced by Firestore rules too.
function EditProfile({ initial, onSaved, onCancel }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [username, setUsername] = useState(initial?.username ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const problem = validateUsername(username) || validateDisplayName(displayName);
    if (problem) return setError(problem);
    setError('');
    setSaving(true);
    try {
      await saveProfile({ username, displayName });
      onSaved({ username: username.trim(), usernameLower: username.trim().toLowerCase(), displayName: displayName.trim() });
    } catch (e) {
      setError(profileErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ gap: 14 }}>
      {!initial && (
        <Text style={styles.body}>Friends find you by your username. They’ll see your display name and username, never your email.</Text>
      )}
      <View style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. green_andrew"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          editable={!saving}
        />
        <Text style={styles.small}>{USERNAME_RULE}. Not case-sensitive, and must be unique.</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Andrew"
          placeholderTextColor={colors.muted}
          maxLength={40}
          editable={!saving}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={saving ? 'Saving…' : initial ? 'Save changes' : 'Save and continue'} onPress={save} disabled={saving} />
      {onCancel && <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />}
    </Card>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { padding: 20, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  heroTitle: { fontSize: font.title - 2, fontWeight: '800', color: colors.text },
  handle: { fontSize: font.body, color: colors.primaryDark, fontWeight: '600' },
  editChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editChipText: { fontSize: font.small, fontWeight: '700', color: colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  tileValue: { fontSize: font.title - 4, fontWeight: '800', color: colors.primary },
  tileLabel: { fontSize: font.small, color: colors.muted, marginTop: 2 },
  links: { gap: 8 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  linkEmoji: { fontSize: 24 },
  linkTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 24, color: colors.muted },
  badge: { backgroundColor: colors.primary, borderRadius: 999, minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, alignItems: 'center' },
  badgeText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.small },
  invite: { gap: 10 },
  inviteTitle: { fontSize: font.body + 2, fontWeight: '800', color: colors.text },
  privacy: { backgroundColor: colors.bg },
  body: { fontSize: font.body, color: colors.text, lineHeight: 24 },
  small: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  field: { gap: 6 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
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
  error: { fontSize: font.small + 1, color: colors.error },
});
