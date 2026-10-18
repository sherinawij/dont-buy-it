// Small status label on catalog cards. Neutral wording and colours — never shaming.
import { Text, View, StyleSheet } from 'react-native';
import { font } from '../theme';
import { useStyles, useTheme } from '../useTheme';

const statusStyles = (colors) => ({
  debating: { label: 'Debating', bg: colors.debatingBg, fg: colors.debatingText },
  resisted: { label: 'Resisted', bg: colors.primarySoft, fg: colors.primaryDark },
  bought: { label: 'Bought', bg: colors.neutralBg, fg: colors.neutralText }, // plain grey: no guilt
});

export default function StatusPill({ status }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const all = statusStyles(colors);
  const s = all[status] ?? all.debating;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const makeStyles = () => StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  text: { fontSize: font.small, fontWeight: '700' },
});
