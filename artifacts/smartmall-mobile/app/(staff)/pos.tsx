import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { AppInput } from '@/src/components/AppInput';
import {
  getOwnerProducts,
  getCashierProducts,
  createOwnerPosSession,
  createCashierPosSession,
  addPosItem,
  addCashierPosItem,
  closePosSession,
  closeCashierPosSession,
  finalizePos,
  finalizeCashierPos,
  getOwnerPosSession,
  getCashierPosSession,
  removePosItem,
  removeCashierPosItem,
  updatePosItem,
  updateCashierPosItem,
  type PosProduct,
  type PosSessionItem,
} from '@/src/features/pos/posApi';
import { formatCurrency } from '@/src/utils/currency';
import { formatNumber, toWesternDigits } from '@/src/utils/numberFormat';
import { getUserRole } from '@/src/utils/roles';
import { useAuthStore } from '@/src/store/authStore';
import { handleFormApiError } from '@/src/utils/errorHandling';

const OWNER_ROLES = new Set(['mall-owner', 'supermarket-owner']);

function productName(product: PosProduct, isAr: boolean): string {
  return (isAr ? product.name_ar : product.name_en) || product.name_ar || product.name_en;
}

function itemName(item: PosSessionItem, isAr: boolean): string {
  return item.product ? productName(item.product, isAr) : `#${item.product_id}`;
}

export default function NativePosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const role = getUserRole(user);
  const isAr = i18n.language.startsWith('ar');
  const isOwner = OWNER_ROLES.has(role);
  const isCashier = role === 'cashier';
  const canUsePos = isOwner || isCashier;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const sessionQuery = useQuery({
    queryKey: ['pos-session', role],
    queryFn: isCashier ? createCashierPosSession : createOwnerPosSession,
    enabled: canUsePos,
    staleTime: 0,
  });
  const sessionToken = sessionQuery.data?.token ?? '';
  const currentSessionQuery = useQuery({
    queryKey: ['pos-session-details', role, sessionToken],
    queryFn: () => isCashier ? getCashierPosSession(sessionToken) : getOwnerPosSession(sessionToken),
    enabled: canUsePos && Boolean(sessionToken),
    refetchInterval: 10_000,
  });
  const productsQuery = useQuery({
    queryKey: ['pos-products', role, deferredSearch],
    queryFn: ({ signal }) => isCashier ? getCashierProducts(deferredSearch, signal) : getOwnerProducts(deferredSearch, signal),
    enabled: canUsePos,
    staleTime: 10_000,
  });

  const invalidateSession = () => {
    void queryClient.invalidateQueries({ queryKey: ['pos-session-details', role, sessionToken] });
  };
  const addMutation = useMutation({
    mutationFn: (productId: number) => isCashier ? addCashierPosItem(sessionToken, productId) : addPosItem(sessionToken, productId),
    onSuccess: invalidateSession,
  });
  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      isCashier ? updateCashierPosItem(itemId, quantity) : updatePosItem(itemId, quantity),
    onSuccess: invalidateSession,
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: number) => isCashier ? removeCashierPosItem(itemId) : removePosItem(itemId),
    onSuccess: invalidateSession,
  });
  const finalizeMutation = useMutation({
    mutationFn: () => isCashier ? finalizeCashierPos(sessionToken) : finalizePos(sessionToken),
    onSuccess: (result) => {
      invalidateSession();
      Alert.alert(t('pos.sale_completed'), t('pos.receipt_number', { id: formatNumber(result.order.id) }));
    },
  });
  const closeMutation = useMutation({
    mutationFn: () => isCashier ? closeCashierPosSession(sessionToken) : closePosSession(sessionToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pos-session', role] });
      router.back();
    },
  });

  const session = currentSessionQuery.data ?? sessionQuery.data;
  const items = session?.items ?? [];
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price_at_scan) * item.quantity, 0),
    [items],
  );
  const error = sessionQuery.error ?? productsQuery.error ?? currentSessionQuery.error;
  const mutationError = addMutation.error ?? updateMutation.error ?? removeMutation.error ?? finalizeMutation.error ?? closeMutation.error;
  const errorMessage = error || mutationError ? handleFormApiError(error ?? mutationError, () => undefined, t) : null;

  if (!canUsePos) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.blocked, { paddingTop: insets.top + 24 }]}>
          <View style={[styles.blockedIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
            {t('pos.title')}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
            {t('pos.cashier_unavailable')}
          </Text>
          <AppButton label={t('common.back')} onPress={() => router.back()} variant="secondary" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, direction: isAr ? 'rtl' : 'ltr' },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={19} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{t('pos.live_session')}</Text>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('pos.title')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pos.close_session')}
            disabled={!sessionToken || closeMutation.isPending}
            onPress={() =>
              Alert.alert(t('pos.close_title'), t('pos.close_message'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('pos.close_session'), style: 'destructive', onPress: () => closeMutation.mutate() },
              ])
            }
            style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: sessionToken ? 1 : 0.5 }]}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
          </Pressable>
        </View>

        <View style={[styles.sessionBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <View style={styles.sessionCopy}>
             <Text style={[styles.sessionLabel, { color: colors.foreground }]}>{t(isCashier ? 'pos.cashier_session_open' : 'pos.session_open')}</Text>
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>
              {sessionToken ? t('pos.session_token', { token: sessionToken }) : t('common.loading')}
            </Text>
          </View>
          <Feather name="shield" size={18} color={colors.success} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('pos.add_products')}</Text>
           <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t(isCashier ? 'pos.cashier_route_note' : 'pos.owner_route_note')}</Text>
        </View>
        <AppInput
          label={t('pos.search_products')}
          value={search}
          onChangeText={setSearch}
          placeholder={t('pos.search_placeholder')}
          autoCapitalize="none"
          returnKeyType="search"
          testID="pos-product-search"
        />

        {productsQuery.isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
        {!productsQuery.isLoading && (productsQuery.data?.data ?? []).length === 0 ? (
          <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('pos.no_products')}</Text>
        ) : null}
        {(productsQuery.data?.data ?? []).slice(0, 12).map((product) => (
          <View key={product.id} style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.productCopy}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>{productName(product, isAr)}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>
                {toWesternDigits(product.barcode || product.sku || t('pos.no_barcode'))}
              </Text>
            </View>
            <View style={styles.productAction}>
              <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(product.current_price ?? product.discount_price ?? product.price)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('pos.add_product')}
                disabled={!sessionToken || addMutation.isPending}
                onPress={() => addMutation.mutate(product.id)}
                style={[styles.addButton, { backgroundColor: colors.primary, opacity: sessionToken ? 1 : 0.5 }]}
              >
                <Feather name="plus" size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={[styles.cartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('pos.current_sale')}</Text>
            <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>{t('pos.item_count', { count: formatNumber(items.length) })}</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Feather name="shopping-bag" size={26} color={colors.mutedForeground} />
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('pos.empty_sale')}</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[styles.cartRow, { borderBottomColor: colors.border }]}>
                <View style={styles.cartCopy}>
                  <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{itemName(item, isAr)}</Text>
                  <Text style={[styles.muted, { color: colors.mutedForeground }]}>{formatCurrency(item.price_at_scan)}</Text>
                </View>
                <View style={styles.quantityControls}>
                  <Pressable
                    accessibilityLabel={t('pos.decrease')}
                    onPress={() => item.quantity > 1 ? updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 }) : removeMutation.mutate(item.id)}
                    style={[styles.quantityButton, { borderColor: colors.border }]}
                  >
                    <Feather name="minus" size={15} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.quantity, { color: colors.foreground }]}>{formatNumber(item.quantity)}</Text>
                  <Pressable
                    accessibilityLabel={t('pos.increase')}
                    onPress={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                    style={[styles.quantityButton, { borderColor: colors.border }]}
                  >
                    <Feather name="plus" size={15} color={colors.foreground} />
                  </Pressable>
                </View>
                <Text style={[styles.lineTotal, { color: colors.foreground }]}>{formatCurrency(Number(item.price_at_scan) * item.quantity)}</Text>
              </View>
            ))
          )}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>{t('pos.total')}</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
          </View>
          <AppButton
            label={t('pos.complete_sale')}
            onPress={() => finalizeMutation.mutate()}
            disabled={!sessionToken || items.length === 0}
            loading={finalizeMutation.isPending}
            testID="pos-complete-sale"
          />
        </View>

        {errorMessage ? <Text style={[styles.error, { color: colors.destructive }]}>{errorMessage}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },
  blocked: { flex: 1, paddingHorizontal: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  blockedIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, maxWidth: 330 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sessionBanner: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  sessionCopy: { flex: 1, gap: 3 },
  sessionLabel: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  sectionHeader: { gap: 3 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  loader: { marginVertical: 16 },
  productRow: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  productCopy: { flex: 1, gap: 4 },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  productAction: { alignItems: 'flex-end', gap: 8 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  addButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cartCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  itemCount: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  emptyCart: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  cartRow: { borderBottomWidth: 1, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartCopy: { flex: 1, gap: 3 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quantityButton: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quantity: { minWidth: 17, textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 13 },
  lineTotal: { width: 68, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  totalRow: { borderTopWidth: 1, paddingTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  error: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
});