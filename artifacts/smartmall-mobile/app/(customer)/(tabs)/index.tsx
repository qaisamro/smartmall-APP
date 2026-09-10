import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { CartButton } from '@/src/components/CartButton';
import { useAuthStore } from '@/src/store/authStore';
import { useMalls } from '@/src/features/malls/useMallsHooks';
import {
  useOffers,
  usePublicProducts,
  useSections,
} from '@/src/features/catalog/useCatalogHooks';
import { useUnreadNotificationCount } from '@/src/features/notifications/useNotificationsHooks';
import { getProductImageUrl, normalizeImageUrl } from '@/src/services/imageUrl';
import { formatCurrency } from '@/src/utils/currency';
import i18n from '@/src/i18n';

type ActionIcon = keyof typeof Feather.glyphMap;

export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';
  const isGuest = !isAuthenticated;
  const isAr = i18n.language.startsWith('ar');

  const mallsQuery = useMalls();
  const offersQuery = useOffers();
  const sectionsQuery = useSections();
  const publicProductsQuery = usePublicProducts();
  const unreadNotificationsQuery = useUnreadNotificationCount({ enabled: isAuthenticated });
  const malls = mallsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];
  const popularProducts = publicProductsQuery.data?.data ?? [];
  const isRefreshing =
    mallsQuery.isRefetching ||
    offersQuery.isRefetching ||
    sectionsQuery.isRefetching ||
    publicProductsQuery.isRefetching ||
    unreadNotificationsQuery.isRefetching;
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const actionCardWidth = Math.max(0, (width - 40 - 12) / 2);

  const refreshHome = () => {
    void Promise.all([
      mallsQuery.refetch(),
      offersQuery.refetch(),
      sectionsQuery.refetch(),
      publicProductsQuery.refetch(),
      ...(isAuthenticated ? [unreadNotificationsQuery.refetch()] : []),
    ]);
  };

  const unreadNotificationCount = unreadNotificationsQuery.data?.count ?? 0;

  const actionItems: Array<{
    key: string;
    icon: ActionIcon;
    label: string;
    onPress: () => void;
    highlighted?: boolean;
  }> = [
    {
      key: 'malls',
      icon: 'shopping-bag',
      label: t('home.quick_malls'),
      onPress: () => router.push('/(customer)/(tabs)/malls'),
    },
    {
      key: 'scanner',
      icon: 'maximize',
      label: t('home.quick_scan'),
      onPress: () => router.push(isGuest ? '/(auth)/login' : '/(customer)/scanner'),
      highlighted: true,
    },
    {
      key: 'offers',
      icon: 'tag',
      label: t('home.quick_offers'),
      onPress: () => router.push('/(customer)/(tabs)/offers'),
    },
    {
      key: 'orders',
      icon: 'package',
      label: t('home.quick_orders'),
      onPress: () => router.push(isGuest ? '/(auth)/login' : '/(customer)/(tabs)/orders'),
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, direction }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refreshHome}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { direction }]}>
        <View style={[styles.headerCopy, { paddingEnd: 14 }]}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{t('home.greeting')}</Text>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
            {user?.name || t('home.guest_greeting')}
          </Text>
        </View>
        {isGuest ? (
          <View style={[styles.guestActions, { direction }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.login')}
              testID="guest-login"
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [
                styles.guestButton,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.guestButtonText, { color: colors.foreground }]}>{t('home.login')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.register')}
              testID="guest-register"
              onPress={() => router.push('/(auth)/register')}
              style={({ pressed }) => [
                styles.guestButton,
                styles.guestButtonPrimary,
                { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.guestButtonText, { color: colors.primaryForeground }]}>{t('home.register')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.headerActions, { direction }]}>
            <View style={styles.notificationButtonWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.notifications')}
                onPress={() => router.push('/(customer)/notifications')}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="bell" size={19} color={colors.foreground} />
              </Pressable>
              {unreadNotificationCount > 0 ? (
                <View style={[styles.notificationBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.notificationBadgeText, { color: colors.destructiveForeground }]}>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <CartButton />
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.search_placeholder')}
        onPress={() => router.push('/(customer)/(tabs)/search')}
        style={({ pressed }) => [
          styles.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            direction,
            opacity: pressed ? 0.76 : 1,
          },
        ]}
      >
        <Feather name="search" size={19} color={colors.mutedForeground} />
        <Text style={[styles.searchText, { color: colors.mutedForeground }]}>
          {t('home.search_placeholder')}
        </Text>
        <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={18} color={colors.primary} />
      </Pressable>

      <View
        style={[
          styles.welcomeCard,
          {
            backgroundColor: colors.primary,
            direction,
          },
        ]}
      >
        <View
          style={[
            styles.welcomeAccentBase,
            isAr ? styles.welcomeAccentRtl : styles.welcomeAccentLtr,
            { backgroundColor: colors.primarySoft },
          ]}
        />
        <View style={styles.welcomeCopy}>
          <Text style={[styles.welcomeTitle, { color: colors.onImage }]}>{t('home.hero_title')}</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.onImageMuted }]}>
            {t('home.hero_subtitle')}
          </Text>
        </View>
        <Feather name="shopping-bag" size={42} color={colors.onImageMuted} />
      </View>

      <SectionHeader title={t('home.quick_actions')} colors={colors} isAr={isAr} />
      <View
        style={[
          styles.actionGrid,
          { direction },
        ]}
      >
        {actionItems.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionCard,
              {
                width: actionCardWidth,
                backgroundColor: action.highlighted ? colors.primary : colors.card,
                borderColor: action.highlighted ? colors.primary : colors.border,
                opacity: pressed ? 0.76 : 1,
              },
            ]}
          >
            <View style={[styles.actionTop, { direction }]}>
              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor: action.highlighted ? colors.primaryForeground : colors.primarySoft,
                  },
                ]}
              >
                <Feather name={action.icon} size={21} color={colors.primary} />
              </View>
              <Feather
                name={isAr ? 'arrow-left' : 'arrow-right'}
                size={16}
                color={action.highlighted ? colors.onImageMuted : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.actionLabel,
                {
                  color: action.highlighted ? colors.primaryForeground : colors.foreground,
                  textAlign: isAr ? 'right' : 'left',
                },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.browse_sections')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/malls')}
          colors={colors}
          isAr={isAr}
        />
        {sectionsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : sections.length === 0 ? (
          <SectionMessage icon="grid" message={t('home.no_sections')} colors={colors} isAr={isAr} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {sections.slice(0, 10).map((section) => (
              <Pressable
                key={section.id}
                accessibilityRole="button"
                onPress={() => router.push('/(customer)/(tabs)/malls')}
                style={({ pressed }) => [
                  styles.sectionChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather name="grid" size={18} color={colors.primary} />
                <Text style={[styles.sectionChipText, { color: colors.foreground }]} numberOfLines={1}>
                  {(isAr ? section.name_ar : section.name_en) || section.name_ar}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title={t('home.featured_malls')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/malls')}
          colors={colors}
          isAr={isAr}
        />
        {mallsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : mallsQuery.isError ? (
          <SectionMessage
            icon="alert-circle"
            message={t('error.network')}
            actionLabel={t('common.retry')}
            onAction={() => void mallsQuery.refetch()}
            colors={colors}
            isAr={isAr}
          />
        ) : malls.length === 0 ? (
          <SectionMessage icon="shopping-bag" message={t('home.no_malls')} colors={colors} isAr={isAr} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            snapToInterval={Math.min(width * 0.76, 300) + 14}
            decelerationRate="fast"
          >
            {malls.slice(0, 6).map((mall) => (
              <Pressable
                key={mall.id}
                accessibilityRole="button"
                onPress={() => router.push(`/(customer)/mall/${mall.slug}`)}
                style={({ pressed }) => [
                  styles.mallCard,
                  {
                    width: Math.min(width * 0.76, 300),
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <MallImage mall={mall} />
                  <View style={[styles.mallBody, { direction }]}>
                    <Text
                      style={[styles.mallName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                      numberOfLines={1}
                    >
                    {isAr ? mall.name_ar : mall.name_en}
                  </Text>
                    <View style={[styles.mallMeta, { direction }]}>
                    <Feather name="clock" size={13} color={colors.mutedForeground} />
                      <Text
                        style={[
                          styles.mallMetaText,
                          { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' },
                        ]}
                        numberOfLines={1}
                      >
                      {mall.open_time && mall.close_time
                        ? `${mall.open_time} - ${mall.close_time}`
                        : mall.type || t('home.mall_available')}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {offersQuery.isLoading || offersQuery.isError || offers.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('home.special_offers')}
            actionLabel={t('home.view_all')}
            onAction={() => router.push('/(customer)/(tabs)/offers')}
            colors={colors}
            isAr={isAr}
          />
          {offersQuery.isLoading ? (
            <HorizontalLoading colors={colors} label={t('common.loading')} />
          ) : offersQuery.isError ? (
            <SectionMessage
              icon="alert-circle"
              message={t('error.network')}
              actionLabel={t('common.retry')}
              onAction={() => void offersQuery.refetch()}
              colors={colors}
              isAr={isAr}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToInterval={236}
              decelerationRate="fast"
            >
              {offers.slice(0, 6).map((offer) => {
                const imageUrl =
                  normalizeImageUrl(offer.image) ||
                  (offer.product ? getProductImageUrl(offer.product) : null);
                return (
                  <Pressable
                    key={offer.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/(customer)/product/${offer.product_id}`)}
                    style={({ pressed }) => [
                      styles.offerCard,
                      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.offerImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.offerImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                        <Feather name="tag" size={28} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={[styles.offerBody, { direction }]}>
                      <Text
                        style={[styles.offerTitle, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}
                        numberOfLines={2}
                      >
                        {isAr ? offer.title_ar : offer.title_en}
                      </Text>
                      <Text
                        style={[styles.offerPrice, { color: colors.destructive, textAlign: isAr ? 'right' : 'left' }]}
                      >
                        {formatCurrency(offer.offer_price)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title={t('home.popular_products')}
          actionLabel={t('home.view_all')}
          onAction={() => router.push('/(customer)/(tabs)/search')}
          colors={colors}
          isAr={isAr}
        />
        {publicProductsQuery.isLoading ? (
          <HorizontalLoading colors={colors} label={t('common.loading')} />
        ) : popularProducts.length === 0 ? (
          <SectionMessage icon="shopping-bag" message={t('home.no_products')} colors={colors} isAr={isAr} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {popularProducts.slice(0, 8).map((product) => {
              const imageUrl = getProductImageUrl(product);
              return (
                <Pressable
                  key={product.id}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(customer)/product/${product.id}`)}
                  style={({ pressed }) => [
                    styles.productCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.productImage, styles.placeholder, { backgroundColor: colors.muted }]}>
                      <Feather name="image" size={28} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={[styles.productBody, { direction }]}>
                    <Text style={[styles.productName, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                      {(isAr ? product.name_ar : product.name_en) || product.name_ar}
                    </Text>
                    <Text style={[styles.productPrice, { color: colors.primary }]}>
                      {formatCurrency(product.current_price)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
  colors,
  isAr,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, { direction: isAr ? 'rtl' : 'ltr' }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[styles.viewAll, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MallImage({ mall }: { mall: { cover_image: string | null; logo: string | null } }) {
  const colors = useColors();
  const imageUrl = normalizeImageUrl(mall.cover_image || mall.logo);
  return imageUrl ? (
    <Image source={{ uri: imageUrl }} style={styles.mallImage} contentFit="cover" />
  ) : (
    <View style={[styles.mallImage, styles.placeholder, { backgroundColor: colors.muted }]}>
      <Feather name="shopping-bag" size={34} color={colors.mutedForeground} />
    </View>
  );
}

function HorizontalLoading({
  colors,
  label,
}: {
  colors: ReturnType<typeof useColors>;
  label: string;
}) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function SectionMessage({
  icon,
  message,
  actionLabel,
  onAction,
  colors,
  isAr,
}: {
  icon: ActionIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  return (
    <View
      style={[
        styles.sectionMessage,
        { backgroundColor: colors.card, borderColor: colors.border, direction: isAr ? 'rtl' : 'ltr' },
      ]}
    >
      <Feather name={icon} size={22} color={colors.mutedForeground} />
      <Text style={[styles.sectionMessageText, { color: colors.mutedForeground }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.retryText, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 3 },
  userName: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  guestActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  guestButton: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonPrimary: { borderWidth: 0 },
  guestButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButtonWrap: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    end: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, lineHeight: 12 },
  searchBar: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  searchText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  welcomeCard: {
    minHeight: 130,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  welcomeAccentBase: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
  },
  welcomeAccentLtr: { right: -48 },
  welcomeAccentRtl: { left: -48 },
  welcomeCopy: { flex: 1 },
  welcomeTitle: { fontFamily: 'Inter_700Bold', fontSize: 21, lineHeight: 27 },
  welcomeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  viewAll: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    justifyContent: 'space-between',
    gap: 12,
  },
  actionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  horizontalList: { gap: 14, paddingEnd: 20 },
  mallCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  mallImage: { width: '100%', height: 142 },
  mallBody: { padding: 14, gap: 8 },
  mallName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  mallMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mallMetaText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  offerCard: { width: 222, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  offerImage: { width: '100%', height: 126 },
  offerBody: { padding: 14, gap: 8 },
  offerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, minHeight: 38 },
  offerPrice: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  sectionChip: {
    minWidth: 132,
    minHeight: 76,
    borderRadius: 17,
    borderWidth: 1,
    padding: 13,
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  productCard: { width: 178, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  productImage: { width: '100%', height: 126 },
  productBody: { padding: 12, gap: 7 },
  productName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18, minHeight: 36 },
  productPrice: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  loadingRow: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  sectionMessage: {
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionMessageText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});