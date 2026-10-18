// Add an item. Built in step 3.
import { Text, View } from 'react-native';
import { colors, font } from '../src/theme';

export default function Add() {
  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: font.body, color: colors.muted }}>Coming in step 3.</Text>
    </View>
  );
}
