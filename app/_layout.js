// Root layout: makes sure someone is signed in, then shows the screen stack.
// Everyone starts as a private anonymous GUEST, so the app works with no login screens.
// Optional accounts (for friends + leaderboard) live in src/auth.js and app/auth.js.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, firebaseConfigured } from '../src/firebase';
import { ensureUserDoc } from '../src/db';
import { font } from '../src/theme';
import { ThemeProvider, useStyles, useTheme } from '../src/useTheme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}

function AppStack() {
  const { colors, scheme } = useTheme();
  const styles = useStyles(makeStyles);
  // Navigation's own backgrounds (behind the floating tab bar, during transitions) follow our palette.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.primary },
    };
  }, [scheme, colors]);
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
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
        {/* Home, Wins, Week and Settings live in app/(tabs); its tabs draw their own headers */}
        <Stack.Screen name="(tabs)" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Something new?' }} />
        <Stack.Screen name="debate/[id]" options={{ title: 'Sprout vs. You' }} />
        <Stack.Screen name="achievement/[key]" options={{ title: 'Share your win' }} />
        <Stack.Screen name="auth" options={{ title: 'Your account' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="friends" options={{ title: 'Friends' }} />
        <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: 16 },
  message: { fontSize: font.body, color: colors.text, textAlign: 'center' },
});
