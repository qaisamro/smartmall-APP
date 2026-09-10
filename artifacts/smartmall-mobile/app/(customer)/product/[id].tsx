import React from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useProduct } from '@/src/features/catalog/useCatalogHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import { AppButton } from '@/src/components/AppButton';
import { CartButton } from '@/src/components/CartButton';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import i18n from '@/src/i18n';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  
  const { data: product, isLoading, isError, refetch } = useProduct(Number(id));

  if (isError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-triangle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
        <AppButton label={t('common.retry')} onPress={refetch} />
      </View>
    );
  }

  if (isLoading || !product) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const imageUrl = getProductImageUrl(product);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.imageContainer, { backgroundColor: colors.imageBackground }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
              <Feather name="image" size={64} color={colors.mutedForeground} />
            </View>
          )}
          <View style={[styles.headerOverlay, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}>
              <Feather name="arrow-left" size={24} color={colors.foreground} />
            </Pressable>
            <CartButton />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>{isAr ? product.name_ar : product.name_en}</Text>
          </View>
          
          <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(product.current_price)}</Text>
          
          {(product.discount_price && product.price !== product.current_price) && (
            <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
              {formatCurrency(product.price)}
            </Text>
          )}

          {product.brand && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{t('product.brand')}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{product.brand}</Text>
            </View>
          )}
          
          {product.unit && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                {t('product.unit')}
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{product.unit}</Text>
            </View>
          )}

          {(isAr ? product.description_ar : product.description_en) || product.description_en ? (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('product.description')}</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {isAr ? product.description_ar || product.description_en : product.description_en}
              </Text>
            </View>
          ) : null}
          <AppButton
            label={t('product.add_to_cart')}
            onPress={() => {
              if (!isAuthenticated) {
                router.push('/(auth)/login');
                return;
              }
              addItem({
                productId: product.id,
                mallId: product.mall_id,
                name: isAr ? product.name_ar : product.name_en,
                unitPrice: Number(product.current_price),
                quantity: 1,
                imageUrl: imageUrl ?? undefined,
                unit: product.unit,
              });
              Alert.alert(t('cart.added_title'), t('cart.added_message'));
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    elevation: 2,
  },
  content: {
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 32,
  },
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 4,
  },
  originalPrice: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  infoValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  descriptionSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
  }
});
