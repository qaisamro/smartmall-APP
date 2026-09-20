import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useGlobalSearch } from '@/src/features/search/useSearchHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { formatCurrency } from '@/src/utils/currency';
import { AppButton } from '@/src/components/AppButton';
import i18n from '@/src/i18n';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { getProductImageUrl } from '@/src/services/imageUrl';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { Product } from '@/src/types/api';
import type { GlobalSearchResult } from '@/src/features/search/searchApi';

type SearchListItem =
  | {
      type: 'header';
      key: string;
      groupIndex: number;
      group: GlobalSearchResult;
      mallName: string;
    }
  | {
      type: 'product';
      key: string;
      product: Product;
    };

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError, refetch } = useGlobalSearch(debouncedQuery);
  const hasGlobalResults = (data?.grouped.length ?? 0) > 0;
  const { data: malls } = useMalls(undefined, {
    enabled: !isAr && hasGlobalResults,
  });
  const searchItems = useMemo<SearchListItem[]>(
    () =>
      (data?.grouped ?? []).flatMap((group, groupIndex) => [
        {
          type: 'header' as const,
          key: `header-${group.mall_id}`,
          groupIndex,
          group,
          mallName: isAr
            ? group.mall_name
            : malls?.find((mall) => mall.id === group.mall_id)?.name_en || group.mall_name,
        },
        ...group.products.map((product) => ({
          type: 'product' as const,
          key: `product-${group.mall_id}-${product.id}`,
          product,
        })),
      ]),
    [data, isAr, malls],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, direction }]}
      behavior="padding"
    >
      <View style={[styles.header, { direction }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, direction }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.foreground, textAlign: isAr ? 'right' : 'left', writingDirection: direction },
            ]}
            placeholder={t('common.search')}
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            accessibilityLabel={t('common.search')}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              style={styles.clearIcon}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
              testID="global-search-clear"
            >
              <Feather name="x-circle" size={20} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {isError && debouncedQuery.length >= 2 ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-triangle" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{t('error.network')}</Text>
          <AppButton label={t('common.retry')} onPress={refetch} />
        </View>
      ) : isLoading && debouncedQuery.length >= 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={searchItems}
          keyExtractor={(item) => item.key}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          windowSize={7}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 84, direction }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            debouncedQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Feather name="search" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
                  {t('search.no_results')}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
                  {t('search.minimum')}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <View style={[styles.groupHeader, item.groupIndex > 0 && styles.groupSpacing, { direction }]}>
                <Feather name="shopping-bag" size={18} color={colors.primary} />
                <Text style={[styles.groupTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
                  {item.mallName}
                </Text>
              </View>
            ) : (
              (() => {
                const imageUrl = getProductImageUrl(item.product);

                return (
                  <Link href={`/(customer)/product/${item.product.id}`} asChild>
                    <Pressable
                      style={StyleSheet.flatten([
                        styles.productCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          direction,
                        },
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
                          <Feather name="image" size={24} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={[styles.productContent, { direction }]}>
                        <Text
                          style={[
                            styles.productTitle,
                            { color: colors.foreground, textAlign: isAr ? 'right' : 'left' },
                          ]}
                          numberOfLines={2}
                        >
                          {isAr ? item.product.name_ar : item.product.name_en}
                        </Text>
                        <Text
                          style={[
                            styles.productPrice,
                            { color: colors.primary, textAlign: isAr ? 'right' : 'left' },
                          ]}
                        >
                          {formatCurrency(item.product.current_price)}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>
                );
              })()
            )
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    height: '100%',
  },
  clearIcon: {
    padding: 4,
    marginStart: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
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
  groupContainer: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupSpacing: {
    marginTop: 24,
  },
  groupTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  productCard: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  productImage: {
    width: 80,
    height: 80,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  productTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    marginBottom: 4,
  },
  productPrice: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
  },
});
