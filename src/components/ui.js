// Small shared building blocks so every screen looks consistent.
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, radius, font } from '../theme';

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// variant: 'primary' (filled green) | 'secondary' (outlined)
export function Button({ title, onPress, variant = 'primary', disabled, style }) {
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
      <Text style={[styles.buttonText, { color: primary ? '#fff' : colors.primaryDark }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  buttonText: { fontSize: font.body, fontWeight: '700' },
});
