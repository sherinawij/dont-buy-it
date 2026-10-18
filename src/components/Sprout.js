// PLACEHOLDER — P3 replaces this with the real SVG Sprout. Props are FIXED:
//   stage: 0..4 (seed → sprout → small plant → bushy → flowering)
//   mood: 'smug' | 'nervous' | 'sweating' | 'panicking' | 'defeated' | 'ecstatic' | 'happy'
//   size: number (px), shakeKey / bounceKey: animate when the value changes
//   still: true → no animation (for screenshotted share cards)
import { Text, View } from 'react-native';

const STAGE_EMOJI = ['🌰', '🌱', '🪴', '🌿', '🌸'];
const MOOD_EMOJI = { smug: '😏', nervous: '😬', sweating: '😅', panicking: '😱', defeated: '😩', ecstatic: '🤩', happy: '🙂' };

export default function Sprout({ stage = 1, mood = 'smug', size = 120 }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.45 }}>{STAGE_EMOJI[stage] ?? '🌱'}</Text>
      <Text style={{ fontSize: size * 0.25 }}>{MOOD_EMOJI[mood] ?? '🙂'}</Text>
    </View>
  );
}
