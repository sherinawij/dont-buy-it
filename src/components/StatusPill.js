// Small status label on catalog cards. Neutral wording and colours — never shaming.
import { Text, View, StyleSheet } from 'react-native';
import { colors, font } from '../theme';

const STATUS = {
  debating: { label: 'Debating', bg: '#FFF4D6', fg: '#7A5A00' },
  resisted: { label: 'Resisted', bg: colors.primarySoft, fg: colors.primaryDark },
  bought: { label: 'Bought', bg: '#EEF1EF', fg: colors.muted }, // plain grey: no guilt
};

export default function StatusPill({ status }) {
  const s = STATUS[status] ?? STATUS.debating;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  text: { fontSize: font.small, fontWeight: '700' },
});
