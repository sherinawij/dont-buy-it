// "Sprout is a sprout · $10 more avoided to grow", with a mini Sprout for each of the 5 growth stages.
// Reached stages are full colour, the current one is ringed, later ones are faded.
import { Text, View, StyleSheet } from 'react-native';
import Sprout from './Sprout';
import { STAGE_NAMES } from '../achievements';
import { formatMoney, nextStageNeeds } from '../calc';
import { font, radius } from '../theme';
import { useStyles } from '../useTheme';

// "Sprout is …" for each stage (same order as STAGE_NAMES).
const STAGE_PHRASES = [
  ['a ', 'seed'],
  ['a ', 'sprout'],
  ['a ', 'small plant'],
  ['', 'bushy'],
  ['', 'flowering'],
];
const DOT = 44;

function growHint(needs) {
  if (!needs) return 'Fully grown. Look at those flowers!';
  const calls = `${needs.decisions} more good ${needs.decisions === 1 ? 'decision' : 'decisions'}`;
  return `${formatMoney(needs.money)} more avoided or ${calls} to grow`;
}

export default function StageStrip({ stage, totalAvoided, decisions }) {
  const styles = useStyles(makeStyles);
  const [article, name] = STAGE_PHRASES[stage] ?? STAGE_PHRASES[0];

  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title}>
          Sprout is {article}
          <Text style={styles.name}>{name}</Text>
        </Text>
        <Text style={styles.hint}>{growHint(nextStageNeeds(totalAvoided, decisions))}</Text>
      </View>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={`Growth stage ${stage + 1} of ${STAGE_NAMES.length}: ${STAGE_NAMES[stage]}`}
      >
        {STAGE_NAMES.map((label, i) => (
          <View key={label} style={[styles.dot, i === stage && styles.current, i > stage && styles.later]}>
            {/* still: five idle animations at once would be busy */}
            <Sprout stage={i} mood="happy" size={DOT - 8} still />
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  text: { gap: 2 },
  title: { fontSize: font.body, fontWeight: '700', color: colors.text },
  name: { color: colors.accent },
  hint: { fontSize: font.small, color: colors.muted, lineHeight: 19 },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  current: { borderWidth: 2, borderColor: colors.primary },
  later: { opacity: 0.4 },
});
