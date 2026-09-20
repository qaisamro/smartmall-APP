import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { AppInput } from '@/src/components/AppInput';
import { apiClient } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import { getUserRole } from '@/src/utils/roles';
import { formatNumber, formatPhone, toWesternDigits } from '@/src/utils/numberFormat';

type StaffOrder = {
  id: number;
  status?: string | null;
  delivery_status?: string | null;
  total_amount?: string | number;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  mall?: { name_ar?: string; name_en?: string } | null;
  user?: { name?: string; phone?: string } | null;
};

function arrayData<T>(data: T[] | { data?: T[] } | undefined): T[] {
  return Array.isArray(data) ? data : data?.data ?? [];
}

export default function StaffDashboardScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const role = getUserRole(user);
  const isAr = i18n.language.startsWith('ar');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const statsQuery = useQuery({
    queryKey: ['staff-stats', role],
    queryFn: async () => {
      const path = role === 'delivery-person' ? '/delivery/stats' : role === 'order-tracker' ? '/tracker/stats' : role === 'admin' || role === 'super-admin' ? '/admin/stats' : '/owner/stats';
      return (await apiClient.get<Record<string, unknown>>(path)).data;
    },
    enabled: role !== 'cashier',
    refetchInterval: 15_000,
  });
  const ordersQuery = useQuery({
    queryKey: ['staff-orders', role],
    queryFn: async () => {
      const path = role === 'delivery-person' ? '/delivery/orders/pending' : role === 'order-tracker' ? '/tracker/orders' : role === 'admin' || role === 'super-admin' ? '/admin/orders/all' : '/owner/orders';
      return (await apiClient.get<StaffOrder[] | { data?: StaffOrder[] }>(path, role === 'order-tracker' ? { params: { view: 'today' } } : undefined)).data;
    },
    enabled: role !== 'cashier',
    refetchInterval: 15_000,
  });
  const productsQuery = useQuery({
    queryKey: ['staff-products'],
    queryFn: async () => (await apiClient.get<{ data?: StaffOrder[] }>('/owner/products')).data,
    enabled: role === 'mall-owner' || role === 'supermarket-owner',
  });
  const complaintsQuery = useQuery({
    queryKey: ['staff-complaints'],
    queryFn: async () => (await apiClient.get<StaffOrder[]>('/admin/complaints')).data,
    enabled: role === 'admin' || role === 'super-admin',
  });
  const acceptMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/delivery/orders/${id}/accept`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff-orders', role] }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'delivering' | 'delivered' | 'failed' }) => apiClient.post(`/delivery/orders/${id}/status`, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['staff-orders', role] }),
  });

  const orders = arrayData(ordersQuery.data);
  const filteredOrders = search.trim()
    ? orders.filter((order) => String(order.id).includes(search.trim()) || order.user?.name?.includes(search.trim()))
    : orders;
  const statEntries = Object.entries(statsQuery.data ?? {}).filter(([, value]) => typeof value === 'string' || typeof value === 'number').slice(0, 5);
  const roleLabel = role === 'delivery-person' ? t('staff.delivery') : role === 'order-tracker' ? t('staff.tracker') : role === 'admin' || role === 'super-admin' ? t('staff.admin') : role === 'cashier' ? t('staff.cashier') : t('staff.owner');
  const canUsePos = role === 'mall-owner' || role === 'supermarket-owner' || role === 'cashier';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30, direction: isAr ? 'rtl' : 'ltr' }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.primary }]}>{roleLabel}</Text>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('staff.welcome', { name: user?.name?.split(' ')[0] ?? '' })}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('staff.subtitle')}</Text>
          </View>
          <Pressable onPress={() => void logout()} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="log-out" size={18} color={colors.destructive} /></Pressable>
        </View>

        {canUsePos ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(staff)/pos')}
            style={[styles.posCard, { backgroundColor: colors.primary }]}
          >
            <View style={styles.posIcon}><Feather name="credit-card" size={22} color={colors.primary} /></View>
            <View style={styles.posCopy}>
              <Text style={[styles.posTitle, { color: colors.primaryForeground }]}>{t('pos.title')}</Text>
              <Text style={[styles.posSubtitle, { color: colors.primaryForeground }]}>{t('pos.open_from_dashboard')}</Text>
            </View>
            <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={20} color={colors.primaryForeground} />
          </Pressable>
        ) : null}

        {role === 'cashier' ? null : (
          <>
            <View style={styles.statsGrid}>
              {statEntries.map(([key, value]) => <View key={key} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.primary }]}>{typeof value === 'number' ? formatNumber(value) : typeof value === 'string' ? toWesternDigits(value) : ''}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{key.replaceAll('_', ' ')}</Text></View>)}
            </View>
            {role === 'mall-owner' || role === 'supermarket-owner' ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('staff.products')}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('staff.products_count', { count: formatNumber(productsQuery.data?.data?.length ?? 0) })}</Text></View> : null}
            {role === 'admin' || role === 'super-admin' ? <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('staff.complaints')}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('staff.complaints_count', { count: formatNumber(complaintsQuery.data?.length ?? 0) })}</Text></View> : null}
            <AppInput label={t('staff.search')} value={search} onChangeText={setSearch} placeholder={t('staff.search_placeholder')} keyboardType={role === 'order-tracker' ? 'default' : 'default'} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{role === 'delivery-person' ? t('staff.pending_orders') : role === 'order-tracker' ? t('staff.tracked_orders') : t('staff.recent_orders')}</Text>
            {filteredOrders.slice(0, 30).map((order) => (
              <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.orderTop}><Text style={[styles.orderId, { color: colors.primary }]}>{t('orders.order_number', { id: formatNumber(order.id) })}</Text><Text style={[styles.status, { color: colors.mutedForeground }]}>{order.delivery_status || order.status || 'pending'}</Text></View>
                <Text style={[styles.orderMall, { color: colors.foreground }]}>{isAr ? order.mall?.name_ar : order.mall?.name_en}</Text>
                {order.user?.name ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{order.user.name} {formatPhone(order.delivery_phone || order.user.phone || '')}</Text> : null}
                {order.delivery_address ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{order.delivery_address}</Text> : null}
                <View style={styles.actionRow}>
                  {role === 'delivery-person' && order.delivery_status === 'preparing' ? <Pressable onPress={() => acceptMutation.mutate(order.id)} style={[styles.action, { backgroundColor: colors.primary }]}><Text style={[styles.actionText, { color: colors.primaryForeground }]}>{t('staff.accept')}</Text></Pressable> : null}
                  {role === 'delivery-person' && order.delivery_status === 'accepted' ? <Pressable onPress={() => statusMutation.mutate({ id: order.id, status: 'delivering' })} style={[styles.action, { backgroundColor: colors.primary }]}><Text style={[styles.actionText, { color: colors.primaryForeground }]}>{t('staff.start_delivery')}</Text></Pressable> : null}
                  {role === 'delivery-person' && order.delivery_status === 'delivering' ? <Pressable onPress={() => statusMutation.mutate({ id: order.id, status: 'delivered' })} style={[styles.action, { backgroundColor: colors.success }]}><Text style={[styles.actionText, { color: '#fff' }]}>{t('staff.mark_delivered')}</Text></Pressable> : null}
                </View>
              </View>
            ))}
            {!ordersQuery.isLoading && filteredOrders.length === 0 ? <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('staff.no_orders')}</Text> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '31%', minHeight: 90, borderWidth: 1, borderRadius: 16, padding: 12, justifyContent: 'center', gap: 5 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 9 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  posCard: { minHeight: 76, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  posIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.82)', alignItems: 'center', justifyContent: 'center' },
  posCopy: { flex: 1, gap: 3 },
  posTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  posSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, opacity: 0.86 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  orderCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 7 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  orderId: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  status: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  orderMall: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  action: { minHeight: 38, borderRadius: 11, paddingHorizontal: 14, justifyContent: 'center' },
  actionText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});