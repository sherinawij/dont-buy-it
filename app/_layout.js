// Root layout: signs the user in anonymously, then shows the screen stack.
// No login screens — Firebase gives every phone its own private, anonymous account.
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
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
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
      </Stack>
    </NavigationThemeProvider>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: 16 },
  message: { fontSize: font.body, color: colors.text, textAlign: 'center' },
});
