// "Your wins" list of achievement cards. Built by P1 (phase B).
import { Text, View } from 'react-native';
import { colors, font } from '../src/theme';

export default function Achievements() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: font.body, color: colors.muted }}>Your wins are coming soon.</Text>
    </View>
  );
}
