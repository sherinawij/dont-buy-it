// Small shared building blocks so every screen looks consistent.
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { radius, font } from '../theme';
import { useStyles, useTheme } from '../useTheme';

export function Card({ style, children }) {
  const styles = useStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

// variant: 'primary' (filled green) | 'secondary' (outlined)
export function Button({ title, onPress, variant = 'primary', disabled, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? colors.onPrimary : colors.primaryDark }]}>{title}</Text>
    </Pressable>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  // Soft shadow on Greenhouse, a mint glow on Midnight Garden (iOS; Android has no coloured shadows).
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.glow,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  secondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  buttonText: { fontSize: font.body, fontWeight: '700' },
});
