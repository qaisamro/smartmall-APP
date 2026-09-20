import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { AppInput } from '@/src/components/AppInput';
import { CartButton } from '@/src/components/CartButton';
import { ApiError } from '@/src/api/errors';
import {
  confirmPendingOrder,
  createPendingOrder,
  type PendingConfirmationInput,
} from '@/src/features/orders/ordersApi';
import { useCartStore, type CartItem } from '@/src/store/cartStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatNumber } from '@/src/utils/numberFormat';
import { useActiveDeliveryZones } from '@/src/features/delivery/useDeliveryHooks';

const checkoutSchema = z.object({
  phone: z.string().max(20, 'validation.phone'),
  address: z.string().max(500, 'validation.address'),
  notes: z.string().max(1000, 'validation.notes'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;
type DeliveryMethod = 'in-mall' | 'pickup' | 'delivery';

interface PendingOrderReference {
  pending_id: number;
  mall_id: number;
  order_id: string;
}

function groupItemsByMall(items: CartItem[]) {
  const grouped = new Map<number, CartItem[]>();
  for (const item of items) {
    const mallItems = grouped.get(item.mallId) ?? [];
    mallItems.push(item);
    grouped.set(item.mallId, mallItems);
  }
  return grouped;
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('in-mall');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryZoneId, setDeliveryZoneId] = useState<number | null>(null);
  const deliveryZonesQuery = useActiveDeliveryZones();
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const selectedDeliveryZone = deliveryZonesQuery.data?.find((zone) => zone.id === deliveryZoneId) ?? null;

  useEffect(() => {
    if (deliveryZoneId === null && deliveryZonesQuery.data?.[0]) {
      setDeliveryZoneId(deliveryZonesQuery.data[0].id);
    }
  }, [deliveryZoneId, deliveryZonesQuery.data]);
  const { control, handleSubmit } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { phone: '', address: '', notes: '' },
  });

  const submit = async (data: CheckoutForm) => {
    const phone = data.phone.trim();
    const address = data.address.trim();
    const notes = data.notes.trim();

    if (deliveryMethod !== 'in-mall' && !phone) {
      setServerError(t('checkout.phone_required'));
      return;
    }
    if (deliveryMethod === 'delivery' && !address) {
      setServerError(t('checkout.address_required'));
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      const pendingOrders: PendingOrderReference[] = [];

      for (const [mallId, mallItems] of groupItemsByMall(items)) {
        const total = mallItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const pending = await createPendingOrder({
          mall_id: mallId,
          items: mallItems.map((item) => ({
            id: item.productId,
            mall_id: item.mallId,
            price: item.unitPrice,
            quantity: item.quantity,
          })),
          total,
          notes: notes || undefined,
          phone: phone || undefined,
        });
        pendingOrders.push({
          pending_id: pending.pending_id,
          mall_id: mallId,
          order_id: pending.order_id,
        });
      }

      if (deliveryMethod === 'in-mall') {
        const [first, ...queue] = pendingOrders;
        if (!first) {
          setServerError(t('error.network'));
          return;
        }

        router.push({
          pathname: '/(customer)/scanner',
          params: {
            pendingOrderId: String(first.pending_id),
            pendingMallId: String(first.mall_id),
            pendingQueue: JSON.stringify(queue),
          },
        });
        return;
      }

      let lastOrderId: number | null = null;
      for (const pending of pendingOrders) {
        const input: PendingConfirmationInput =
          deliveryMethod === 'delivery'
            ? {
                delivery_method: 'delivery',
                delivery_address: address,
                delivery_phone: phone || undefined,
                general_notes: notes || undefined,
                delivery_zone_id: selectedDeliveryZone?.id,
                delivery_fee: selectedDeliveryZone ? Number(selectedDeliveryZone.fee) : undefined,
              }
            : {
                delivery_method: 'pickup',
                delivery_phone: phone || undefined,
                general_notes: notes || undefined,
              };
        const confirmation = await confirmPendingOrder(pending.pending_id, input);
        lastOrderId = confirmation.order.id;
      }

      void queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      clear();
      if (lastOrderId !== null) {
        router.replace(`/(customer)/order/${lastOrderId}`);
      }
    } catch (error) {
      setServerError(getCheckoutErrorMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppButton label={t('common.back')} onPress={() => router.back()} variant="secondary" />
          <Text style={[styles.title, { color: colors.foreground }]}>{t('checkout.title')}</Text>
        </View>
        <CartButton />
      </View>
      <View style={[styles.notice, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
        <Feather name="shield" size={18} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.primary }]}>{t('checkout.server_authoritative')}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('checkout.delivery_method')}</Text>
      <View style={styles.methodList}>
        {(['in-mall', 'pickup', 'delivery'] as const).map((method) => {
          const selected = method === deliveryMethod;
          return (
            <Pressable
              key={method}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setDeliveryMethod(method)}
              style={[
                styles.methodOption,
                {
                  backgroundColor: selected ? colors.primarySoft : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather
                name={selected ? 'check-circle' : 'circle'}
                size={20}
                color={selected ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.methodText, { color: selected ? colors.primary : colors.foreground }]}>
                {t(`checkout.${method.replace('-', '_')}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {deliveryMethod === 'delivery' && deliveryZonesQuery.data?.length ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('checkout.delivery_zone')}</Text>
          <View style={styles.methodList}>
            {deliveryZonesQuery.data.map((zone) => {
              const selected = zone.id === deliveryZoneId;
              return (
                <Pressable
                  key={zone.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setDeliveryZoneId(zone.id)}
                  style={[
                    styles.methodOption,
                    {
                      backgroundColor: selected ? colors.primarySoft : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.methodText, { color: selected ? colors.primary : colors.foreground }]}>{zone.name}</Text>
                  <Text style={[styles.zoneFee, { color: colors.mutedForeground }]}>{formatCurrency(zone.fee)}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('checkout.customer_details')}</Text>
      {(['phone', 'address', 'notes'] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <AppInput
              label={t(`checkout.${name}`)}
              placeholder={t(`checkout.${name}_placeholder`)}
              keyboardType={name === 'phone' ? 'phone-pad' : 'default'}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline={name !== 'phone'}
              style={name !== 'phone' ? styles.multiline : undefined}
              error={fieldState.error?.message ? t(fieldState.error.message) : undefined}
            />
          )}
        />
      ))}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('checkout.summary')}</Text>
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {items.map((item) => (
          <View key={`${item.mallId}-${item.productId}`} style={styles.row}>
            <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={1}>
              {item.name} × {formatNumber(item.quantity)}
            </Text>
            <Text style={[styles.itemText, { color: colors.mutedForeground }]}>
              {formatCurrency(item.unitPrice * item.quantity)}
            </Text>
          </View>
        ))}
        <View style={[styles.row, styles.totalRow, { borderTopColor: colors.divider }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground }]}>{t('cart.subtotal')}</Text>
          <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(subtotal)}</Text>
        </View>
        {deliveryMethod === 'delivery' && selectedDeliveryZone ? (
          <View style={styles.row}>
            <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{t('checkout.delivery_fee')}</Text>
            <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{formatCurrency(selectedDeliveryZone.fee)}</Text>
          </View>
        ) : null}
      </View>
      {serverError ? <Text style={[styles.error, { color: colors.destructive }]}>{serverError}</Text> : null}
      <AppButton
        label={deliveryMethod === 'in-mall' ? t('checkout.continue_to_scan') : t('checkout.place_order')}
        onPress={handleSubmit(submit)}
        loading={isSubmitting}
        disabled={isSubmitting || items.length === 0}
      />
    </ScrollView>
  );
}

function getCheckoutErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError && error.status === 422) return t('error.validation');
  if (error instanceof ApiError && error.status === 401) return t('error.credentials');
  if (error instanceof ApiError && error.status === 403) return t('error.forbidden');
  if (error instanceof ApiError && error.status === 404) return t('error.not_found');
  if (error instanceof ApiError && error.status && error.status >= 500) return t('error.server');
  return t('error.network');
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 8 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10 },
  noticeText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 20 },
  methodList: { gap: 10 },
  methodOption: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  methodText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  zoneFee: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginStart: 'auto' },
  multiline: { minHeight: 82, height: undefined, paddingTop: 14, textAlignVertical: 'top' },
  summary: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  itemText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13 },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, marginTop: 4 },
  totalLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  total: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  error: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 19, textAlign: 'center' },
});