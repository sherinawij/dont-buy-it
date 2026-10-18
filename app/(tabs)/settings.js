// Settings: every field is optional. The app works fine with all of them blank.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet } from 'react-native';
import { useKeyboardInset } from '../../src/useKeyboardInset';
import { Button, Card } from '../../src/components/ui';
import { getSettings, saveSettings } from '../../src/db';
import { parseAmount } from '../../src/calc';
import { font, radius } from '../../src/theme';
import { THEME_MODES, useStyles, useTheme } from '../../src/useTheme';

// Number fields shown on screen: [key, label, hint]
const MONEY_FIELDS = [
  ['hourlyWage', 'Hourly wage ($/hour)', 'Shows how many hours of work an item costs.'],
  ['goalAmount', 'Savings goal amount ($)', 'Spending you avoid could go toward this.'],
  ['discretionaryBudget', 'Monthly fun-money budget ($)', 'Optional. Sprout estimates what’s left this month from items you mark as bought in this app.'],
];

const MODE_LABELS = { system: 'System', light: 'Light', dark: 'Dark' };

export default function Settings() {
  const { colors, mode, setMode } = useTheme();
  const styles = useStyles(makeStyles);
  const keyboard = useKeyboardInset();
  const [form, setForm] = useState(null); // text values while editing
  const [status, setStatus] = useState('');

  useEffect(() => {
    getSettings().then((s) =>
      setForm({
        hourlyWage: s.hourlyWage?.toString() ?? '',
        savingsGoal: s.savingsGoal ?? '',
        goalAmount: s.goalAmount?.toString() ?? '',
        discretionaryBudget: s.discretionaryBudget?.toString() ?? '',
      })
    );
  }, []);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus('');
  };

  // Which number fields contain something that isn't a valid amount.
  const invalid = form ? MONEY_FIELDS.filter(([key]) => Number.isNaN(parseAmount(form[key]))).map(([key]) => key) : [];

  async function save(values) {
    setStatus('Saving…');
    try {
      await saveSettings(values);
      setStatus('Saved ✓');
    } catch (e) {
      setStatus('Couldn’t save. Check your connection.');
    }
  }

  const onSave = () =>
    save({
      hourlyWage: parseAmount(form.hourlyWage),
      savingsGoal: form.savingsGoal.trim() || null,
      goalAmount: parseAmount(form.goalAmount),
      discretionaryBudget: parseAmount(form.discretionaryBudget),
    });

  // One tap removes all financial context.
  const onClear = () => {
    setForm({ hourlyWage: '', savingsGoal: '', goalAmount: '', discretionaryBudget: '' });
    save({ hourlyWage: null, savingsGoal: null, goalAmount: null, discretionaryBudget: null });
  };

  if (!form) return null;

  return (
    // Pad by exactly the part the keyboard covers, so the lower fields can scroll into view.
    <View ref={keyboard.viewRef} collapsable={false} style={{ flex: 1, paddingBottom: keyboard.inset }}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Appearance applies right away, separate from the Save button below */}
        <View style={styles.field}>
          <Text style={styles.label}>Appearance</Text>
          <View style={styles.segments} accessibilityRole="radiogroup">
            {THEME_MODES.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: mode === m }}
                style={[styles.segment, mode === m && styles.segmentOn]}
              >
                <Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>{MODE_LABELS[m]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>Light is Greenhouse, Dark is Midnight Garden. System follows your phone.</Text>
        </View>

        <Card style={styles.note}>
          <Text style={styles.noteText}>
            Everything here is optional. Estimates use only what you enter in this app — it’s not connected to any bank account.
          </Text>
        </Card>

        <View style={styles.field}>
          <Text style={styles.label}>What are you saving for?</Text>
          <TextInput
            style={styles.input}
            value={form.savingsGoal}
            onChangeText={(v) => update('savingsGoal', v)}
            placeholder="e.g. Trip to Montréal"
            placeholderTextColor={colors.muted}
            maxLength={40}
          />
        </View>

        {MONEY_FIELDS.map(([key, label, hint]) => (
          <View style={styles.field} key={key}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, invalid.includes(key) && styles.inputError]}
              value={form[key]}
              onChangeText={(v) => update(key, v)}
              placeholder="Leave blank to skip"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <Text style={invalid.includes(key) ? styles.error : styles.hint}>
              {invalid.includes(key) ? 'Please enter a number, like 18.50' : hint}
            </Text>
          </View>
        ))}

        <Button title="Save" onPress={onSave} disabled={invalid.length > 0} />
        <Button title="Clear all financial info" variant="secondary" onPress={onClear} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { padding: 20, gap: 16, paddingBottom: 48 },
  note: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  noteText: { fontSize: font.small + 1, color: colors.primaryDark, lineHeight: 21 },
  field: { gap: 6 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  segments: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  segment: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.body, fontWeight: '700', color: colors.muted },
  segmentTextOn: { color: colors.onPrimary },
  hint: { fontSize: font.small, color: colors.muted },
  error: { fontSize: font.small, color: colors.error },
  status: { fontSize: font.body, color: colors.primaryDark, textAlign: 'center' },
});
