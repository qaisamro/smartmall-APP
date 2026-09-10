import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { normalizeImageUrl } from '@/src/services/imageUrl';
import { AppButton } from '@/src/components/AppButton';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function MallsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'mall' | 'supermarket'>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: malls, isLoading, refetch, isRefetching, isError } = useMalls({
    search: debouncedQuery,
    type: selectedType === 'all' ? '' : selectedType,
  });

  const filterOptions: Array<{ value: typeof selectedType; label: string }> = [
    { value: 'all', label: t('search.filter_all') },
    { value: 'mall', label: t('search.filter_malls') },
    { value: 'supermarket', label: t('search.filter_supermarkets') },
  ];

  const getMallTypeLabel = (type: string) => {
    const normalizedType = type.trim().toLowerCase();

    if (normalizedType === 'mall' || normalizedType === 'shopping_mall' || normalizedType === 'shopping center') {
      return t('mall.type_mall');
    }

    if (normalizedType === 'supermarket' || normalizedType === 'super_market') {
      return t('mall.type_supermarket');
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, direction }]}
      behavior="padding"
    >
      <FlatList
        data={malls || []}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 84 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.header, { direction }]}>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
              {t('tabs.malls')}
            </Text>
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, direction }]}>
              <Feather name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.foreground, textAlign: isAr ? 'right' : 'left', writingDirection: direction },
                ]}
                placeholder={t('search.search_malls')}
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
                accessibilityLabel={t('search.search_malls')}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery('')}
                  style={styles.clearButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.clear')}
                  testID="malls-search-clear"
                >
                  <Feather name="x-circle" size={20} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterRow, { direction }]}
              keyboardShouldPersistTaps="handled"
            >
              {filterOptions.map(option => {
                const isSelected = selectedType === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSelectedType(option.value)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                        direction,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={`malls-filter-${option.value}`}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        { color: isSelected ? colors.primaryForeground : colors.foreground, textAlign: isAr ? 'right' : 'left' },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isError ? (
            <View style={styles.centerContainer}>
              <Feather name="alert-triangle" size={48} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {t('error.network')}
              </Text>
              <AppButton label={t('common.retry')} onPress={refetch} />
            </View>
          ) : (
            <View style={[styles.emptyContainer, { direction }]}>
              <Feather name="inbox" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
                {query.length > 0 || selectedType !== 'all' ? t('search.no_malls') : t('common.empty')}
              </Text>
            </View>
          )
        }
        renderItem={({ item: mall }) => (
          <Link href={`/(customer)/mall/${mall.slug}`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.mallCard,
                { backgroundColor: colors.card, borderColor: colors.border, direction },
              ])}
            >
              {mall.cover_image || mall.logo ? (
                <Image
                  source={{ uri: normalizeImageUrl(mall.cover_image || mall.logo)! }}
                  style={styles.mallImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.mallImagePlaceholder, { backgroundColor: colors.muted }]}>
                  <Feather name="image" size={32} color={colors.mutedForeground} />
                </View>
              )}
              <View style={[styles.mallContent, { direction }]}>
                <Text style={[styles.mallTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
                  {isAr ? mall.name_ar : mall.name_en}
                </Text>
                {(isAr ? mall.description_ar : mall.description_en) && (
                  <Text
                    style={[styles.mallDesc, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}
                    numberOfLines={2}
                  >
                    {isAr ? mall.description_ar : mall.description_en}
                  </Text>
                )}
                <View style={[styles.mallFooter, { direction }]}>
                  {mall.open_time && mall.close_time && (
                    <View style={[styles.badge, { direction }]}>
                      <Feather name="clock" size={14} color={colors.mutedForeground} />
                      <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                        {mall.open_time} - {mall.close_time}
                      </Text>
                    </View>
                  )}
                  {mall.type && getMallTypeLabel(mall.type) && (
                    <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {getMallTypeLabel(mall.type)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          </Link>
        )}
      />
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
    gap: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
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
  clearButton: {
    padding: 4,
    marginStart: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  mallCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mallImage: {
    width: '100%',
    height: 160,
  },
  mallImagePlaceholder: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mallContent: {
    padding: 16,
  },
  mallTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    marginBottom: 4,
  },
  mallDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  mallFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
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
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    textAlign: 'center',
  },
});