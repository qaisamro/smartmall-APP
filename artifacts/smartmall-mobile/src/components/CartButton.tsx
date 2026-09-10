import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import { formatNumber } from '@/src/utils/numberFormat';

export function CartButton() {
  const colors = useColors();
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  return (
    <Pressable
      accessibilityLabel="Cart"
      accessibilityRole="button"
      onPress={() => router.push(isAuthenticated ? '/(customer)/cart' : '/(auth)/login')}
      style={StyleSheet.flatten([
        styles.button,
        { backgroundColor: colors.card, borderColor: colors.border },
      ])}
    >
      <Feather name="shopping-cart" size={20} color={colors.foreground} />
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={[styles.badgeText, { color: colors.destructiveForeground }]}>
            {count > 99 ? '99+' : formatNumber(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
});