// Root layout: makes sure someone is signed in, then shows the screen stack.
// Everyone starts as a private anonymous GUEST, so the app works with no login screens.
// Optional accounts (for friends + leaderboard) live in src/auth.js and app/auth.js.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, firebaseConfigured } from '../src/firebase';
import { ensureUserDoc } from '../src/db';
import AccountButton from '../src/components/AccountButton';
import { colors, font } from '../src/theme';

export default function RootLayout() {
  // The signed-in user's id. null while signing in (or between accounts).
  const [uid, setUid] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    // Fires once Firebase has restored any saved user from AsyncStorage.
    // Only create a new anonymous user if there isn't one already.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setUid(null); // unmount screens so nothing keeps listening to the old account
          await signInAnonymously(auth); // triggers this listener again with the new guest
          return;
        }
        await ensureUserDoc();
        setUid(user.uid);
      } catch (e) {
        setError(e.message);
      }
    });
    return unsubscribe;
  }, []);

  if (!firebaseConfigured || error || !uid) {
    return (
      <View style={styles.center}>
        {!firebaseConfigured ? (
          <Text style={styles.message}>Firebase isn't configured yet. Copy .env.example to .env, fill it in, and restart Expo.</Text>
        ) : error ? (
          <Text style={styles.message}>Couldn't connect: {error}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.message}>Waking Sprout up…</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {/* key={uid}: switching accounts remounts every screen, so no data from the
          previous account (catalog, Sprout, wins) can linger on screen. */}
      <Stack
        key={uid}
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Don't Buy It!", headerRight: () => <AccountButton /> }} />
        <Stack.Screen name="add" options={{ title: 'Something new?' }} />
        <Stack.Screen name="debate/[id]" options={{ title: 'Sprout vs. You' }} />
        <Stack.Screen name="summary" options={{ title: 'Your week' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="achievements" options={{ title: 'Your wins' }} />
        <Stack.Screen name="achievement/[key]" options={{ title: 'Share your win' }} />
        <Stack.Screen name="auth" options={{ title: 'Your account' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="friends" options={{ title: 'Friends' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: 16 },
  message: { fontSize: font.body, color: colors.text, textAlign: 'center' },
});
