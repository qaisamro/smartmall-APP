import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { ApiError } from '@/src/api/errors';
import { AppButton } from '@/src/components/AppButton';
import { confirmPendingOrder } from '@/src/features/orders/ordersApi';
import { scanCode, type ScanResponse } from '@/src/features/scanner/scannerApi';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import type { Product } from '@/src/types/api';

interface PendingOrderReference {
  pending_id: number;
  mall_id: number;
  order_id: string;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePendingQueue(value: string | string[] | undefined): PendingOrderReference[] {
  const raw = firstParam(value);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PendingOrderReference =>
        typeof entry === 'object' &&
        entry !== null &&
        Number.isFinite((entry as PendingOrderReference).pending_id) &&
        Number.isFinite((entry as PendingOrderReference).mall_id),
    );
  } catch {
    return [];
  }
}

export default function ScannerScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const clear = useCartStore((state) => state.clear);
  const params = useLocalSearchParams<{
    pendingOrderId?: string | string[];
    pendingMallId?: string | string[];
    pendingQueue?: string | string[];
    mallId?: string | string[];
    mallSlug?: string | string[];
  }>();
  const initialPendingId = Number(firstParam(params.pendingOrderId));
  const initialMallId = Number(firstParam(params.pendingMallId));
  const selectedMallIdValue = Number(firstParam(params.mallId));
  const selectedMallId =
    Number.isFinite(selectedMallIdValue) && selectedMallIdValue > 0 ? selectedMallIdValue : undefined;
  const hasPendingOrder = Number.isFinite(initialPendingId) && initialPendingId > 0 && Number.isFinite(initialMallId);
  const [permission, requestPermission] = useCameraPermissions();
  const [currentPending, setCurrentPending] = useState<PendingOrderReference | null>(
    hasPendingOrder
      ? {
          pending_id: initialPendingId,
          mall_id: initialMallId,
          order_id: '',
        }
      : null,
  );
  const [queue, setQueue] = useState(() => parsePendingQueue(params.pendingQueue));
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const authStatus = useAuthStore((state) => state.status);

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (isProcessingRef.current || isProcessing || !data.trim()) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanError(null);
    setScanResult(null);
    setScannedProduct(null);

    try {
      const response = await scanCode(data, currentPending?.mall_id ?? selectedMallId);
      if (!currentPending) {
        if (response.type === 'product' && response.product) {
          if (selectedMallId && response.product.mall_id !== selectedMallId) {
            setScanError(t('scanner.mall_mismatch'));
            return;
          }
          setScannedProduct(response.product);
          return;
        }

        const standaloneMessage = handleStandaloneScan(response);
        if (standaloneMessage) setScanResult(t(standaloneMessage));
        return;
      }

      if (response.type !== 'mall') {
        setScanError(t('scanner.invalid_mall_code'));
        return;
      }

      if (
        response.mall_id === undefined ||
        String(response.mall_id) !== String(currentPending.mall_id)
      ) {
        setScanError(t('scanner.mall_mismatch'));
        return;
      }

      const confirmation = await confirmPendingOrder(currentPending.pending_id, {
        delivery_method: 'direct_purchase',
      });
      void queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      const [next, ...remaining] = queue;

      if (next) {
        setQueue(remaining);
        setCurrentPending(next);
        setScanResult(t('scanner.mall_confirmed_next'));
        return;
      }

      clear();
      router.replace(`/(customer)/order/${confirmation.order.id}`);
    } catch (error) {
      setScanError(getScannerErrorMessage(error, t));
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setScanError(null);
    setScanResult(null);
    setScannedProduct(null);
  };

  const addScannedProductToCart = () => {
    if (!scannedProduct) return;
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    addItem({
      productId: scannedProduct.id,
      mallId: scannedProduct.mall_id,
      name: i18n.language.startsWith('ar')
        ? scannedProduct.name_ar || scannedProduct.name_en
        : scannedProduct.name_en || scannedProduct.name_ar,
      unitPrice: Number(scannedProduct.current_price),
      quantity: 1,
      imageUrl: getProductImageUrl(scannedProduct) ?? undefined,
      unit: scannedProduct.unit,
    });
    Alert.alert(t('cart.added_title'), t('cart.added_message'));
  };

  if (hasPendingOrder && authStatus === 'anonymous') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Feather name="camera-off" size={48} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>{t('scanner.permission_required')}</Text>
        <Text style={[styles.help, { color: colors.mutedForeground }]}>{t('scanner.permission_help')}</Text>
        {permission.canAskAgain ? (
          <AppButton label={t('scanner.grant_permission')} onPress={() => void requestPermission()} />
        ) : null}
        <AppButton label={t('common.back')} onPress={() => router.back()} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            'qr',
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'code93',
            'datamatrix',
            'pdf417',
            'aztec',
            'codabar',
            'itf14',
          ],
        }}
        onBarcodeScanned={isProcessing || Boolean(scannedProduct) ? undefined : handleBarcodeScanned}
      />
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.overlayTitle}>{t('scanner.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.scanFrame} />
        <View style={[styles.bottomPanel, { backgroundColor: 'rgba(0,0,0,0.72)' }]}>
          {isProcessing ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.instruction}>{t('scanner.verifying')}</Text>
            </>
          ) : scanError ? (
            <>
              <Text style={styles.panelTitle}>{t('scanner.error_title')}</Text>
              <Text style={styles.result}>{scanError}</Text>
              <AppButton label={t('scanner.scan_again')} onPress={() => setScanError(null)} />
            </>
          ) : scannedProduct ? (
            <>
              <Text style={styles.panelTitle}>{t('scanner.product_found')}</Text>
              <Text style={styles.result}>
                {i18n.language.startsWith('ar')
                  ? scannedProduct.name_ar || scannedProduct.name_en
                  : scannedProduct.name_en || scannedProduct.name_ar}
              </Text>
              <Text style={styles.productPrice}>
                {formatCurrency(scannedProduct.current_price)}
              </Text>
              <AppButton label={t('scanner.add_to_cart')} onPress={addScannedProductToCart} />
              <AppButton label={t('scanner.scan_again')} onPress={resetScan} variant="secondary" />
            </>
          ) : scanResult ? (
            <>
              <Text style={styles.panelTitle}>{t('scanner.result')}</Text>
              <Text style={styles.result}>{scanResult}</Text>
              <AppButton label={t('scanner.scan_again')} onPress={resetScan} />
            </>
          ) : (
            <Text style={styles.instruction}>
              {currentPending ? t('scanner.mall_instruction') : t('scanner.scan_instruction')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function handleStandaloneScan(response: ScanResponse): string | null {
  if (response.type === 'mall' && response.slug) {
    router.replace(`/(customer)/mall/${encodeURIComponent(response.slug)}`);
    return null;
  }
  return response.type === 'product' ? 'scanner.product_scanned' : 'scanner.order_scanned';
}

function getScannerErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof ApiError && error.status === 404) return t('scanner.invalid_code');
  if (error instanceof ApiError && error.status === 422) return t('error.validation');
  if (error instanceof ApiError && error.status === 401) return t('error.credentials');
  if (error instanceof ApiError && error.status === 403) return t('error.forbidden');
  if (error instanceof ApiError && error.status && error.status >= 500) return t('error.server');
  return t('error.network');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22, textAlign: 'center' },
  help: {
    maxWidth: 320,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  overlayTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 20 },
  scanFrame: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 24,
  },
  bottomPanel: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
    borderRadius: 24,
    marginHorizontal: 16,
  },
  instruction: {
    color: '#fff',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  panelTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  result: {
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  productPrice: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
  },
});