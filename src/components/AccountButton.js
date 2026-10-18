// Small header button on Home: "Sign in" for guests, 👤 for accounts. Opens the profile screen,
// which explains accounts to guests. Owner: P1 (social features).
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthUser } from '../auth';
import { colors, font } from '../theme';

export default function AccountButton() {
  const { guest } = useAuthUser();
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={guest ? 'Sign in or create an account' : 'Your profile'}
      hitSlop={10}
      style={({ pressed }) => [{ paddingHorizontal: 6, paddingVertical: 4 }, pressed && { opacity: 0.5 }]}
    >
      <Text style={{ fontSize: guest ? font.small + 1 : 22, fontWeight: '700', color: colors.primaryDark }}>
        {guest ? 'Sign in' : '👤'}
      </Text>
    </Pressable>
  );
}
