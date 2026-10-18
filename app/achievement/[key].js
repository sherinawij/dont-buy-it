// Preview + share one achievement card.
// Key format: skipped_<itemId> | slept_<itemId> | milestone_<stage> | alt_<itemId>
// READ-ONLY: this screen never writes to Firestore, so sharing can't change savings.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import AchievementCard from '../../src/components/AchievementCard';
import { Button } from '../../src/components/ui';
import { subscribeItems } from '../../src/db';
import { findAchievement, shareMessage } from '../../src/achievements';
import { colors, font } from '../../src/theme';

const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function AchievementScreen() {
  const { key } = useLocalSearchParams();
  const [items, setItems] = useState(null); // null = loading
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);

  // Live items, so a card for a decision made a second ago still shows up while Firestore syncs.
  useEffect(() => subscribeItems(setItems, () => setItems([])), []);

  if (!items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const achievement = findAchievement(items, key);
  if (!achievement) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>Sprout can’t find this win. It may still be syncing — try again in a moment.</Text>
        <Button title="Back" variant="secondary" onPress={goHome} style={{ marginTop: 16 }} />
      </View>
    );
  }

  async function share() {
    setSharing(true);
    try {
      // Screenshot just the card as a PNG file, then open the phone's native share sheet.
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing not available');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your win' });
    } catch {
      // Fallback: share the same win as text so the button always does something.
      await Share.share({ message: shareMessage(achievement) }).catch(() => {});
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AchievementCard ref={cardRef} achievement={achievement} />
      <Text style={styles.note}>
        Sharing just sends this picture. It doesn’t change your jar or anything else in the app.
      </Text>
      <Button title={sharing ? 'Opening…' : 'Share'} onPress={share} disabled={sharing} style={styles.button} />
      <Button title="Done" variant="secondary" onPress={goHome} style={styles.button} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  note: { fontSize: font.small, color: colors.muted, textAlign: 'center', maxWidth: 320 },
  button: { alignSelf: 'stretch' },
});
