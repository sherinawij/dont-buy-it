// Root layout: signs the user in anonymously, then shows the screen stack.
// No login screens — Firebase gives every phone its own private, anonymous account.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, firebaseConfigured } from '../src/firebase';
import { ensureUserDoc } from '../src/db';
import { colors, font } from '../src/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    // Fires once Firebase has restored any saved user from AsyncStorage.
    // Only create a new anonymous user if there isn't one already.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await signInAnonymously(auth); // triggers this listener again with the new user
          return;
        }
        await ensureUserDoc();
        setReady(true);
      } catch (e) {
        setError(e.message);
      }
    });
    return unsubscribe;
  }, []);

  if (!firebaseConfigured || error || !ready) {
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
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Don't Buy It!" }} />
        <Stack.Screen name="add" options={{ title: 'Something new?' }} />
        <Stack.Screen name="debate/[id]" options={{ title: 'Sprout vs. You' }} />
        <Stack.Screen name="summary" options={{ title: 'Your week' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="achievements" options={{ title: 'Your wins' }} />
        <Stack.Screen name="achievement/[key]" options={{ title: 'Share your win' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: 16 },
  message: { fontSize: font.body, color: colors.text, textAlign: 'center' },
});
