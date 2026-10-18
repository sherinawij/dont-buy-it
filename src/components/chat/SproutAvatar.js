// A round, face-only mini Sprout for the chat. At avatar size the whole plant (pot included) is too
// small to read, so we draw Sprout bigger and crop the circle to its head, which sits around
// (120, 150) in the 240×260 drawing for every growth stage.
import { StyleSheet, View } from 'react-native';
import Sprout from '../Sprout';
import { useStyles } from '../../useTheme';

export const AVATAR_SIZE = 44;
const ZOOM = 2.15; // Sprout drawn at ~2× the circle, so the head fills it
const HEAD_Y = 150 / 260; // head centre, as a fraction of the drawing's height

export default function SproutAvatar({ mood, stage, size = AVATAR_SIZE, still = false }) {
  const styles = useStyles(makeStyles);
  const inner = size * ZOOM;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={{ position: 'absolute', left: size / 2 - inner / 2, top: size / 2 - inner * HEAD_Y }}>
        <Sprout stage={stage} mood={mood} size={inner} still={still} />
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  circle: { backgroundColor: colors.primarySoft, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
});
