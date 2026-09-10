import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CartButton } from '@/src/components/CartButton';
import { useOffers } from '@/src/features/catalog/useCatalogHooks';
import { getProductImageUrl, normalizeImageUrl } from '@/src/services/imageUrl';
import type { Offer } from '@/src/types/api';
import { formatCurrency } from '@/src/utils/currency';
import i18n from '@/src/i18n';

export default function OffersScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: offers, isLoading, isError, refetch } = useOffers();
  const isAr = i18n.language.startsWith('ar');
  const renderOffer = useCallback(
    ({ item: offer }: { item: Offer }) => {
      const imageUrl = normalizeImageUrl(offer.image) || (offer.product ? getProductImageUrl(offer.product) : null);

      return (
        <Link href={`/(customer)/product/${offer.product_id}`} asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ])}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.placeholder, { backgroundColor: colors.muted }]}>
                <Feather name="tag" size={30} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
                {isAr ? offer.title_ar : offer.title_en}
              </Text>
              <Text style={[styles.price, { color: colors.destructive }]}>
                {formatCurrency(offer.offer_price)}
              </Text>
            </View>
          </Pressable>
        </Link>
      );
    },
    [colors, isAr],
  );

  return (
    <FlatList
      data={offers ?? []}
      keyExtractor={(offer) => offer.id.toString()}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
      ]}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{t('offers.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('offers.subtitle')}</Text>
            </View>
            <CartButton />
          </View>
          {isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
          {isError ? (
            <View style={styles.state}>
              <Feather name="alert-circle" size={32} color={colors.destructive} />
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('error.network')}</Text>
              <Pressable onPress={() => void refetch()}>
                <Text style={[styles.retry, { color: colors.primary }]}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : null}
          {!isLoading && !isError && (!offers || offers.length === 0) ? (
            <View style={styles.state}>
              <Feather name="tag" size={32} color={colors.mutedForeground} />
              <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('offers.empty')}</Text>
            </View>
          ) : null}
        </>
      }
      renderItem={renderOffer}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 4 },
  loader: { marginTop: 40 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 70 },
  stateText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  retry: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  gridRow: { gap: 14 },
  card: { width: '47%', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: 130 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 12, gap: 8 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, minHeight: 38 },
  price: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});