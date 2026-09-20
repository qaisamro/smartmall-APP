import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getAppDirection } from '@/src/i18n';

const HOME_ROUTE = '/(customer)/(tabs)';

type GuestNavItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  route: string;
};

export function AuthScreenHeader() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const direction = getAppDirection(i18n.language);
  const isAr = direction === 'rtl';

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 10,
          direction,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('auth.continue_as_guest')}
        onPress={() => router.replace(HOME_ROUTE)}
        style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.65 : 1 }]}
      >
        <Feather name="x" size={21} color={colors.foreground} />
        <Text style={[styles.closeLabel, { color: colors.foreground }]}>{t('auth.continue_as_guest')}</Text>
      </Pressable>
      <Text style={[styles.headerHint, { color: colors.mutedForeground, textAlign: isAr ? 'left' : 'right' }]}>
        {t('auth.browse_without_account')}
      </Text>
    </View>
  );
}

export function GuestNavigationBar() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const direction = getAppDirection(i18n.language);

  const items: GuestNavItem[] = [
    { icon: 'home', label: t('guest_nav.home'), route: HOME_ROUTE },
    { icon: 'grid', label: t('guest_nav.sections'), route: '/(customer)/(tabs)/sections' },
    { icon: 'shopping-bag', label: t('guest_nav.malls'), route: '/(customer)/(tabs)/malls' },
    { icon: 'search', label: t('guest_nav.search'), route: '/(customer)/(tabs)/search' },
  ];

  return (
    <View
      style={[
        styles.navigationBar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
          direction,
        },
      ]}
    >
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => router.replace(item.route as never)}
          style={({ pressed }) => [styles.navigationItem, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Feather name={item.icon} size={19} color={colors.primary} />
          <Text style={[styles.navigationLabel, { color: colors.foreground }]} numberOfLines={1}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
  },
  closeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  headerHint: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    gap: 6,
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  navigationItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: 42,
  },
  navigationLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    textAlign: 'center',
  },
});