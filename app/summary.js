// Weekly summary. Built in step 6.
import { Text, View } from 'react-native';
import { colors, font } from '../src/theme';

export default function Summary() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: font.body, color: colors.muted }}>Coming in step 6.</Text>
    </View>
  );
}
