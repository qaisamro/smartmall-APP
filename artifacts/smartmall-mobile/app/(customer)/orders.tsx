import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CartButton } from '@/src/components/CartButton';
import { AppButton } from '@/src/components/AppButton';
import { useCustomerOrders } from '@/src/features/orders/useOrdersHooks';
import { formatCurrency } from '@/src/utils/currency';
import i18n from '@/src/i18n';
import { formatDate, formatNumber } from '@/src/utils/numberFormat';

function statusLabel(status: string | null | undefined, t: (key: string) => string) {
  return t(`orders.status.${status || 'pending'}`);
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const query = useCustomerOrders();
  const orders = query.data?.pages.flatMap((page) => page.data) ?? [];
  const isAr = i18n.language.startsWith('ar');

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={34} color={colors.destructive} />
        <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('error.network')}</Text>
        <AppButton label={t('common.retry')} onPress={() => void query.refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('orders.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('orders.subtitle')}</Text>
        </View>
        <CartButton />
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: insets.bottom + 100 }}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('orders.empty_title')}</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('orders.empty_message')}</Text>
          </View>
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null}
        renderItem={({ item }) => (
          <Link href={`/(customer)/order/${item.id}`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ])}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={[styles.orderId, { color: colors.foreground }]}>
                    {t('orders.order_number', { id: formatNumber(item.id) })}
                  </Text>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>
                    {formatDate(item.created_at, i18n.language)}
                  </Text>
                </View>
                <View style={[styles.status, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    {statusLabel(item.delivery_status || item.status, t)}
                  </Text>
                </View>
              </View>
              <View style={[styles.cardBottom, { borderTopColor: colors.divider }]}>
                <Text style={[styles.mall, { color: colors.mutedForeground }]}>
                  {isAr ? item.mall?.name_ar : item.mall?.name_en}
                </Text>
                <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(item.total_amount)}</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  orderId: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  status: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  cardBottom: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  mall: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 90 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
});