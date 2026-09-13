import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useCustomerOrderTracking } from '@/src/features/orders/useOrdersHooks';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatPhone, formatNumber } from '@/src/utils/numberFormat';

const statusIcons: Record<string, keyof typeof Feather.glyphMap> = {
  pending: 'clock',
  preparing: 'loader',
  ready: 'check-circle',
  accepted: 'check-circle',
  delivering: 'truck',
  delivered: 'check-circle',
};

export default function TrackingScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const query = useCustomerOrderTracking();
  const orders = query.data?.data ?? [];

  if (query.isLoading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('common.loading')}</Text></View>;
  }

  if (query.isError) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Feather name="alert-circle" size={30} color={colors.destructive} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('error.network')}</Text><Pressable onPress={() => void query.refetch()} style={[styles.retry, { backgroundColor: colors.primary }]}><Text style={[styles.retryText, { color: colors.primaryForeground }]}>{t('common.retry')}</Text></Pressable></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, direction: isAr ? 'rtl' : 'ltr' }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={20} color={colors.foreground} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('tracking.title')}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('tracking.subtitle')}</Text></View>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: insets.bottom + 30, gap: 12 }}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListEmptyComponent={<View style={styles.empty}><Feather name="truck" size={38} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('tracking.empty_title')}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('tracking.empty_message')}</Text></View>}
        renderItem={({ item }) => {
          const status = item.delivery_status || item.status || 'pending';
          const icon = statusIcons[status] ?? 'package';
          return (
            <Pressable onPress={() => router.push(`/(customer)/order/${item.id}`)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTop, { direction: isAr ? 'rtl' : 'ltr' }]}>
                <View style={[styles.status, { backgroundColor: colors.primarySoft }]}><Feather name={icon} size={15} color={colors.primary} /><Text style={[styles.statusText, { color: colors.primary }]}>{t(`orders.status.${status}`, { defaultValue: t('orders.status.pending') })}</Text></View>
                <View style={styles.orderCopy}><Text style={[styles.mall, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{isAr ? item.mall?.name_ar : item.mall?.name_en}</Text><Text style={[styles.orderId, { color: colors.mutedForeground }]}>{t('orders.order_number', { id: formatNumber(item.id) })}</Text></View>
              </View>
              {item.delivery_address ? <View style={styles.detailRow}><Feather name="map-pin" size={15} color={colors.primary} /><Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.delivery_address}</Text></View> : null}
              {item.delivery_person?.name ? <View style={styles.detailRow}><Feather name="user" size={15} color={colors.primary} /><Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.delivery_person.name}</Text>{item.delivery_person.phone ? <Text style={[styles.detail, { color: colors.primary }]}>{formatPhone(item.delivery_person.phone)}</Text> : null}</View> : null}
              <View style={[styles.footer, { borderTopColor: colors.divider }]}><Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(item.created_at, i18n.language)}</Text><Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(item.total_amount)}</Text></View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retry: { minHeight: 42, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  orderCopy: { flex: 1, gap: 4 },
  mall: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  orderId: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detail: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 100 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
});