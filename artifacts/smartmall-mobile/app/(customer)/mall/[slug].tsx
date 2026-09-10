import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useMallBySlug, useMallSections } from '@/src/features/malls/useMallsHooks';
import { useProducts } from '@/src/features/catalog/useCatalogHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { I18nManager } from 'react-native';
import { getProductImageUrl, normalizeImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import { AppButton } from '@/src/components/AppButton';
import i18n from '@/src/i18n';
import type { Product } from '@/src/types/api';

interface SectionFilter {
  id: number;
  name_ar: string;
  name_en: string;
  depth: number;
}

export default function MallDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  
  const { data: mall, isLoading: isLoadingMall, isError: isErrorMall, refetch: refetchMall } = useMallBySlug(slug!);
  
  const [selectedSection, setSelectedSection] = useState<number | undefined>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { data: sectionsData } = useMallSections(mall?.id as number);
  
  const {
    data: productsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useProducts(mall?.id as number, { mall_section_id: selectedSection, search: debouncedSearchQuery });

  const products = useMemo(
    () => productsData?.pages.flatMap((page) => page.data) ?? [],
    [productsData],
  );
  const sectionFilters = useMemo<SectionFilter[]>(() => {
    const sections = sectionsData?.sections ?? [];
    const filters: SectionFilter[] = [];

    for (const section of sections) {
      if ((section.product_count ?? 0) > 0) {
        filters.push({
          id: section.id,
          name_ar: section.name_ar,
          name_en: section.name_en || section.name_ar,
          depth: 0,
        });
      }

      for (const child of section.children ?? []) {
        if ((child.product_count ?? 0) > 0) {
          filters.push({
            id: child.id,
            name_ar: child.name_ar,
            name_en: child.name_en || child.name_ar,
            depth: 1,
          });
        }
      }
    }

    return filters;
  }, [sectionsData]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const renderProduct = useCallback(
    ({ item: product }: { item: Product }) => {
      const imageUrl = getProductImageUrl(product);

      return (
        <Link href={`/(customer)/product/${product.id}`} asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.productCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ])}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.productImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.productImagePlaceholder, { backgroundColor: colors.muted }]}>
                <Feather name="image" size={32} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                {isAr ? product.name_ar : product.name_en}
              </Text>
              <Text style={[styles.productPrice, { color: colors.primary }]}>
                {formatCurrency(product.current_price)}
              </Text>
            </View>
          </Pressable>
        </Link>
      );
    },
    [colors, isAr],
  );

  if (isErrorMall) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Feather name="alert-triangle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
        <AppButton label={t('common.retry')} onPress={refetchMall} />
      </View>
    );
  }

  if (isLoadingMall || !mall) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {mall.cover_image || mall.logo ? (
          <Image
            source={{ uri: normalizeImageUrl(mall.cover_image || mall.logo)! }}
            style={styles.coverImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.coverImagePlaceholder, { backgroundColor: colors.muted }]} />
        )}
        <View
          style={[
            styles.headerOverlay,
            { backgroundColor: colors.overlay, paddingTop: insets.top + 10 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.overlayStrong }]}
          >
            <Feather
              name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
              size={24}
              color={colors.onImage}
            />
          </Pressable>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.mallTitle, { color: colors.onImage }]}>
            {isAr ? mall.name_ar : mall.name_en}
          </Text>
          {mall.open_time && mall.close_time && (
            <Text style={[styles.mallTime, { color: colors.onImageMuted }]}>
              {t('mall.open_until')} {mall.close_time}
            </Text>
          )}
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder={t('mall.search_products')}
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                <Feather name="x-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mall.scan_product')}
            testID={`mall-${mall.id}-barcode-scanner`}
            onPress={() =>
              router.push({
                pathname: '/(customer)/scanner',
                params: { mallId: String(mall.id), mallSlug: mall.slug },
              })
            }
            style={[styles.scannerButton, { backgroundColor: colors.primary }]}
          >
            <Feather name="maximize" size={18} color={colors.primaryForeground} />
            <Text style={[styles.scannerButtonText, { color: colors.primaryForeground }]}>
              {t('mall.scan_product')}
            </Text>
          </Pressable>
        </View>
      </View>

      {sectionFilters.length > 0 && (
        <View style={[styles.sectionsWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionsList}>
            <Pressable
              style={[
                styles.sectionChip,
                { backgroundColor: selectedSection === undefined ? colors.primary : colors.muted },
              ]}
              onPress={() => setSelectedSection(undefined)}
            >
              <Text style={[
                styles.sectionChipText,
                { color: selectedSection === undefined ? colors.primaryForeground : colors.mutedForeground },
              ]}>
                {t('mall.all_products')}
              </Text>
            </Pressable>
            {sectionFilters.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.sectionChip,
                  {
                    backgroundColor: selectedSection === item.id ? colors.primary : colors.muted,
                    marginStart: item.depth === 1 ? 2 : 0,
                  }
                ]}
                onPress={() => setSelectedSection(item.id)}
              >
                <Text style={[
                  styles.sectionChipText,
                  { color: selectedSection === item.id ? colors.primaryForeground : colors.mutedForeground }
                ]}>
                  {item.depth === 1 ? `› ${isAr ? item.name_ar : item.name_en}` : (isAr ? item.name_ar : item.name_en)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {isErrorProducts ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
          <AppButton label={t('common.retry')} onPress={refetchProducts} />
        </View>
      ) : (
        <FlatList
          data={products}
           keyExtractor={(item) => item.id.toString()}
           numColumns={2}
           initialNumToRender={10}
           maxToRenderPerBatch={8}
           windowSize={7}
           contentContainerStyle={[styles.productsList, { paddingBottom: insets.bottom + 20 }]}
           columnWrapperStyle={styles.productsRow}
           onEndReached={handleEndReached}
           onEndReachedThreshold={0.5}
           ListEmptyComponent={
             !isLoadingProducts ? (
               <View style={styles.emptyContainer}>
                 <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
                 <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('common.empty')}</Text>
               </View>
             ) : (
               <View style={styles.loadingContainer}>
                 <ActivityIndicator color={colors.primary} />
               </View>
             )
           }
           ListFooterComponent={
             isFetchingNextPage ? (
               <View style={styles.footerLoader}>
                 <ActivityIndicator color={colors.primary} />
               </View>
             ) : null
           }
           renderItem={renderProduct}
         />
      )}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    height: 240,
    position: 'relative',
  },
  coverImage: {
    ...StyleSheet.absoluteFill,
  },
  coverImagePlaceholder: {
    ...StyleSheet.absoluteFill,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  mallTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 4,
  },
  mallTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginLeft: 8,
    height: '100%',
  },
  clearIcon: {
    padding: 4,
  },
  sectionsWrapper: {
    borderBottomWidth: 1,
  },
  sectionsList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  sectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sectionChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  scannerButton: {
    minHeight: 42,
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scannerButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  productsList: {
    padding: 20,
  },
  productsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 140,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    marginBottom: 8,
    height: 40,
  },
  productPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  }
});
