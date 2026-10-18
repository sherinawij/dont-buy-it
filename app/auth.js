// Create an account or sign in. Only needed for friends + leaderboard; the rest of the app works as a guest.
// Create account KEEPS this phone's progress (same uid). Sign in SWITCHES accounts and does not merge.
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card } from '../src/components/ui';
import { authErrorMessage, register, signIn, useAuthUser, validateCredentials } from '../src/auth';
import { subscribeItems } from '../src/db';
import { formatMoney, totalSaved } from '../src/calc';
import { colors, font, radius } from '../src/theme';

export default function AuthScreen() {
  const params = useLocalSearchParams();
  const { guest } = useAuthUser();
  const [mode, setMode] = useState(params.mode === 'signin' ? 'signin' : 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [guestItems, setGuestItems] = useState(null); // this phone's current (guest) catalog

  useEffect(() => subscribeItems(setGuestItems, () => setGuestItems([])), []);

  const itemCount = guestItems?.length ?? 0;
  const avoided = guestItems ? totalSaved(guestItems) : 0;
  const registering = mode === 'register';

  if (!guest) {
    // Already signed in to an account (e.g. came back here after signing in).
    return (
      <View style={styles.center}>
        <Text style={styles.body}>You’re signed in.</Text>
        <Button title="Go to your profile" onPress={() => router.replace('/profile')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  async function submit() {
    const problem = validateCredentials(email, password);
    if (problem) return setError(problem);
    setError('');

    if (!registering && itemCount > 0) {
      // Never silently drop or reassign data: make the user choose.
      const ok = await new Promise((resolve) =>
        Alert.alert(
          'Switch to your account?',
          `This phone’s guest progress (${itemCount} ${itemCount === 1 ? 'item' : 'items'}, ${formatMoney(avoided)} avoided) ` +
            'won’t be added to that account, and you won’t be able to get back to it. ' +
            'To keep it, choose “Create account” instead.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Sign in anyway', style: 'destructive', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        )
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      if (registering) await register(email, password);
      else await signIn(email, password); // the layout remounts every screen for the new account
      router.replace('/profile');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Create account / Sign in toggle */}
        <View style={styles.tabs}>
          {[['register', 'Create account'], ['signin', 'Sign in']].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => { setMode(key); setError(''); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === key }}
              style={[styles.tab, mode === key && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === key && styles.tabTextOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.note}>
          {guestItems == null ? (
            <ActivityIndicator color={colors.primary} />
          ) : registering ? (
            <Text style={styles.noteText}>
              {itemCount > 0
                ? `Your progress on this phone (${itemCount} ${itemCount === 1 ? 'item' : 'items'}, ${formatMoney(avoided)} avoided) will be saved to your new account.`
                : 'Create an account to add friends and see how your spending avoided compares.'}
            </Text>
          ) : (
            <Text style={styles.noteText}>
              Sign in to an account you already made. {itemCount > 0 ? 'This phone’s guest progress won’t be merged into it.' : ''}
            </Text>
          )}
        </Card>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!busy}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={registering ? 'new-password' : 'current-password'}
            textContentType={registering ? 'newPassword' : 'password'}
            editable={!busy}
            onSubmitEditing={submit}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={busy ? 'One moment…' : registering ? 'Create account' : 'Sign in'} onPress={submit} disabled={busy} />
        <Text style={styles.small}>Your email stays private. Friends only ever see your display name and username.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  body: { fontSize: font.body, color: colors.text },
  tabs: { flexDirection: 'row', backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, alignItems: 'center' },
  tabOn: { backgroundColor: colors.card },
  tabText: { fontSize: font.body, fontWeight: '600', color: colors.primaryDark },
  tabTextOn: { fontWeight: '800', color: colors.text },
  note: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  noteText: { fontSize: font.small + 1, color: colors.primaryDark, lineHeight: 21 },
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
  small: { fontSize: font.small, color: colors.muted, textAlign: 'center' },
});
