// Profile: guests see what an account is for; signed-in users set a unique username + display name,
// and can log out. Owner: P1 (social features).
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import { Button, Card } from '../src/components/ui';
import { signOutUser, useAuthUser } from '../src/auth';
import {
  getMyProfile, profileErrorMessage, saveProfile, USERNAME_RULE, validateDisplayName, validateUsername,
} from '../src/profile';
import { colors, font, radius } from '../src/theme';

export default function ProfileScreen() {
  const { user, guest } = useAuthUser();
  return guest ? <GuestProfile /> : <AccountProfile key={user.uid} email={user.email} />;
}

function GuestProfile() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ gap: 8 }}>
        <Text style={styles.title}>You’re using Sprout as a guest 🌱</Text>
        <Text style={styles.body}>
          Everything works without an account. Create one to add friends and see a friends-only leaderboard of
          spending avoided. Your progress on this phone comes with you.
        </Text>
      </Card>
      <Button title="Create account" onPress={() => router.push('/auth?mode=register')} />
      <Button title="I already have an account" variant="secondary" onPress={() => router.push('/auth?mode=signin')} />
    </ScrollView>
  );
}

function AccountProfile({ email }) {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not set up yet
  const [loadError, setLoadError] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoadError(false);
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setUsername(p?.username ?? '');
        setDisplayName(p?.displayName ?? '');
      })
      .catch(() => setLoadError(true));
  }
  useEffect(load, []);

  async function save() {
    const problem = validateUsername(username) || validateDisplayName(displayName);
    if (problem) return setError(problem);
    setError('');
    setSaving(true);
    setStatus('');
    try {
      await saveProfile({ username, displayName });
      setProfile({ username: username.trim(), usernameLower: username.trim().toLowerCase(), displayName: displayName.trim() });
      setStatus('Saved ✓');
    } catch (e) {
      setError(profileErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

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

  const settingUp = profile === null;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 4 }}>
          {settingUp ? (
            <Text style={styles.title}>Pick a username</Text>
          ) : (
            <>
              <Text style={styles.title}>{profile.displayName}</Text>
              <Text style={styles.handle}>@{profile.username}</Text>
            </>
          )}
          <Text style={styles.small}>Signed in as {email} (only you can see this)</Text>
        </Card>

        {settingUp ? (
          <Text style={styles.body}>Friends find you by your username. They’ll see your display name and username, never your email.</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="👥 Friends" onPress={() => router.push('/friends')} style={{ flex: 1 }} />
            <Button title="🏆 Leaderboard" onPress={() => router.push('/leaderboard')} style={{ flex: 1 }} />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(v) => { setUsername(v); setStatus(''); }}
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
            onChangeText={(v) => { setDisplayName(v); setStatus(''); }}
            placeholder="e.g. Andrew"
            placeholderTextColor={colors.muted}
            maxLength={40}
            editable={!saving}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : settingUp ? 'Save and continue' : 'Save changes'} onPress={save} disabled={saving} />
        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Button title="Log out" variant="secondary" onPress={logOut} style={{ marginTop: 12 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { fontSize: font.title - 4, fontWeight: '800', color: colors.text },
  handle: { fontSize: font.body, color: colors.primaryDark, fontWeight: '600' },
  body: { fontSize: font.body, color: colors.text, lineHeight: 24 },
  small: { fontSize: font.small, color: colors.muted },
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
  status: { fontSize: font.body, color: colors.primaryDark, textAlign: 'center' },
});
