import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { CartButton } from '@/src/components/CartButton';
import { EmptyState } from '@/src/components/AsyncState';
import { useCartStore, type CartItem } from '@/src/store/cartStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatNumber } from '@/src/utils/numberFormat';

function quantityStep(unit?: string | null) {
  return unit && /كيلو|كجم|كغ|\bkg\b|kilo/i.test(unit) ? 0.1 : 1;
}

export default function CartScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const changeQuantity = (item: CartItem, delta: number) => {
    const next = Math.round((item.quantity + delta * quantityStep(item.unit)) * 10) / 10;
    updateQuantity(item.productId, item.mallId, next);
  };

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('cart.title')}</Text>
          <CartButton />
        </View>
        <EmptyState title={t('cart.empty_title')} message={t('cart.empty_message')} />
        <AppButton label={t('cart.start_shopping')} onPress={() => router.push('/(customer)/(tabs)/malls')} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('cart.title')}</Text>
        <CartButton />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.mallId}-${item.productId}`}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 180 }}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={24} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.itemBody}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.unitPrice, { color: colors.primary }]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <View style={styles.itemFooter}>
                <View style={[styles.quantity, { borderColor: colors.border }]}>
                  <Pressable
                    accessibilityLabel={t('cart.decrease')}
                    onPress={() => changeQuantity(item, -1)}
                    style={styles.quantityButton}
                  >
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.quantityValue, { color: colors.foreground }]}>
                    {formatNumber(item.quantity)}
                  </Text>
                  <Pressable
                    accessibilityLabel={t('cart.increase')}
                    onPress={() => changeQuantity(item, 1)}
                    style={styles.quantityButton}
                  >
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
                <Text style={[styles.lineTotal, { color: colors.foreground }]}>
                  {formatCurrency(item.unitPrice * item.quantity)}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityLabel={t('cart.remove')}
              onPress={() => removeItem(item.productId, item.mallId)}
              style={styles.removeButton}
            >
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              onPress={() =>
                Alert.alert(t('cart.clear_title'), t('cart.clear_message'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('cart.clear'), style: 'destructive', onPress: clear },
                ])
              }
              style={styles.clearButton}
            >
              <Feather name="trash" size={16} color={colors.destructive} />
              <Text style={[styles.clearText, { color: colors.destructive }]}>{t('cart.clear')}</Text>
            </Pressable>
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  {t('cart.item_count')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatNumber(itemCount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
                  {t('cart.subtotal')}
                </Text>
                <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(subtotal)}</Text>
              </View>
              <AppButton label={t('cart.checkout')} onPress={() => router.push('/(customer)/checkout')} />
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  item: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    minHeight: 116,
  },
  image: { width: 84, height: 84, borderRadius: 12 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 6 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 20 },
  unitPrice: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  quantity: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  quantityButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { minWidth: 28, textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  lineTotal: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: 16, marginTop: 8 },
  clearButton: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  clearText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summary: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  summaryValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 22 },
});