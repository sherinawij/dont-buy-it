// Home screen. Step 1 placeholder: navigation only.
// Sprout, the savings jar and the catalog arrive in later steps.
import { ScrollView, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card } from '../src/components/ui';
import { uid } from '../src/db';
import { colors, font } from '../src/theme';

export default function Home() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>🌱 Sprout is here.</Text>
        <Text style={styles.body}>Signed in anonymously as {uid().slice(0, 8)}…</Text>
      </Card>
      <Button title="I want to buy something…" onPress={() => router.push('/add')} />
      <Button title="Your week" variant="secondary" onPress={() => router.push('/summary')} />
      <Button title="Settings" variant="secondary" onPress={() => router.push('/settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  body: { fontSize: font.body, color: colors.muted, marginTop: 6 },
});
