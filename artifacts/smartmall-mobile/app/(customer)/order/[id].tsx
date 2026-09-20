import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { CartButton } from '@/src/components/CartButton';
import { isCustomerOrderUnavailable } from '@/src/features/orders/ordersApi';
import { useCustomerOrder } from '@/src/features/orders/useOrdersHooks';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import i18n from '@/src/i18n';
import { formatDateTime, formatNumber, formatPhone } from '@/src/utils/numberFormat';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useCustomerOrder(Number(id));
  const isAr = i18n.language.startsWith('ar');
  const isUnavailable = query.isError && isCustomerOrderUnavailable(query.error);

  if (query.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (query.isError || !query.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={34} color={colors.destructive} />
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>
          {t(isUnavailable ? 'orders.detail_unavailable' : 'orders.detail_error')}
        </Text>
        {isUnavailable ? (
          <AppButton label={t('common.back')} onPress={() => router.back()} />
        ) : (
          <AppButton label={t('common.retry')} onPress={() => void query.refetch()} />
        )}
      </View>
    );
  }

  const order = query.data;
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('orders.detail_title')}</Text>
        <CartButton />
      </View>
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.orderNumber, { color: colors.foreground }]}>
          {t('orders.order_number', { id: formatNumber(order.id) })}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formatDateTime(order.created_at, {}, i18n.language)}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('orders.status_label')}</Text>
          <Text style={[styles.value, { color: colors.primary }]}>
            {t(`orders.status.${order.delivery_status || order.status || 'pending'}`)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('orders.total')}</Text>
          <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(order.total_amount)}</Text>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('orders.items')}</Text>
      <View style={[styles.items, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {order.items?.map((item) => {
          const imageUrl = getProductImageUrl(item.product || {});

          return (
            <View key={item.id} style={[styles.item, { borderBottomColor: colors.divider }]}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
                  <Feather name="image" size={20} color={colors.mutedForeground} />
                </View>
              )}
              <View style={styles.itemBody}>
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                  {isAr ? item.product?.name_ar : item.product?.name_en}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {t('orders.quantity')}: {formatNumber(item.quantity)}
                </Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                {formatCurrency(Number(item.price_at_sale) * item.quantity)}
              </Text>
            </View>
          );
        })}
      </View>
      {order.delivery_address || order.delivery_phone || order.general_notes ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('orders.customer_details')}</Text>
          <View style={[styles.details, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {order.delivery_phone ? <Text style={[styles.detail, { color: colors.foreground }]}>{t('checkout.phone')}: {formatPhone(order.delivery_phone)}</Text> : null}
            {order.delivery_address ? <Text style={[styles.detail, { color: colors.foreground }]}>{t('checkout.address')}: {order.delivery_address}</Text> : null}
            {order.general_notes ? <Text style={[styles.detail, { color: colors.foreground }]}>{t('checkout.notes')}: {order.general_notes}</Text> : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  summary: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  orderNumber: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  value: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 24, marginBottom: 10 },
  items: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  image: { width: 54, height: 54, borderRadius: 10 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, gap: 5 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  itemPrice: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  details: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
});