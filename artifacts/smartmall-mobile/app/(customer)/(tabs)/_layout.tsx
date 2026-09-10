import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from 'react-i18next';
import { getAppDirection } from '@/src/i18n';
// NOTE: @expo/vector-icons not @expo-vector-icons
import { Feather as FeatherIcon } from '@expo/vector-icons';

function NativeTabLayout() {
  const { t, i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);

  return (
    <View style={{ flex: 1, direction }}>
      <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="malls">
        <NativeTabs.Trigger.Icon sf={{ default: 'building.2', selected: 'building.2.fill' }} md="store" />
        <NativeTabs.Trigger.Label>{t('tabs.malls')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="offers">
        <NativeTabs.Trigger.Icon sf={{ default: 'tag', selected: 'tag.fill' }} md="local_offer" />
        <NativeTabs.Trigger.Label>{t('tabs.offers')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <NativeTabs.Trigger.Icon sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }} md="receipt" />
        <NativeTabs.Trigger.Label>{t('tabs.orders')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

function ClassicTabLayout() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const safeAreaInsets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const direction = getAppDirection(i18n.language);
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.mutedForeground,
      sceneStyle: { direction },
      tabBarStyle: {
        position: 'absolute' as const,
        backgroundColor: isIOS ? 'transparent' : colors.background,
        borderTopWidth: isWeb ? 1 : 0,
        borderTopColor: colors.border,
        elevation: 0,
        direction,
        paddingBottom: safeAreaInsets.bottom,
        ...(isWeb ? { height: 84 } : {}),
      },
      tabBarBackground: () =>
        isIOS ? (
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : isWeb ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
        ) : null,
    }),
    [
      colors.background,
      colors.border,
      colors.mutedForeground,
      colors.primary,
      direction,
      isDark,
      isIOS,
      isWeb,
      safeAreaInsets.bottom,
    ],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={24} /> : <FeatherIcon name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="malls"
        options={{
          title: t('tabs.malls'),
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="building.2" tintColor={color} size={24} /> : <FeatherIcon name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t('tabs.offers'),
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="tag" tintColor={color} size={24} /> : <FeatherIcon name="tag" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="shippingbox" tintColor={color} size={24} /> : <FeatherIcon name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person" tintColor={color} size={24} /> : <FeatherIcon name="user" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="sections" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
