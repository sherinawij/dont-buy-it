// Preview + share one achievement card. Built by P1 (phase B).
// Key format: skipped_<itemId> | slept_<itemId> | milestone_<stage> | alt_<itemId>
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, font } from '../../src/theme';

export default function AchievementCardScreen() {
  const { key } = useLocalSearchParams();
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: font.body, color: colors.muted }}>Card “{key}” is coming soon.</Text>
    </View>
  );
}
