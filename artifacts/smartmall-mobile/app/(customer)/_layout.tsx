import { Stack, Redirect, useSegments } from 'expo-router';
import { useMemo } from 'react';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from 'react-i18next';
import { getAppDirection } from '@/src/i18n';
import { getUserRole } from '@/src/utils/roles';

export default function CustomerLayout() {
  const colors = useColors();
  const { i18n } = useTranslation();
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
  const segments = useSegments();
  const direction = getAppDirection(i18n.language);
  const screenOptions = useMemo(
    () => ({
      contentStyle: { direction },
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.foreground,
      headerShadowVisible: false,
      headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
    }),
    [colors.background, colors.foreground, direction],
  );
  
  if (status === 'unavailable') {
    return <Redirect href="/" />;
  }
  const routeGroup = segments[1];
  const routeName = segments[2];
  const isPublicRoute =
    (routeGroup === '(tabs)' && (!routeName || ['index', 'malls', 'offers', 'search', 'sections'].includes(routeName))) ||
    routeGroup === 'mall' ||
    routeGroup === 'product' ||
    routeGroup === 'scanner';

  if (status === 'anonymous' && !isPublicRoute) {
    return <Redirect href="/(auth)/login" />;
  }
  if (status === 'authenticated' && getUserRole(user) !== 'customer') {
    return <Redirect href="/(staff)" />;
  }

  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="mall/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="scanner" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="account-settings" options={{ headerShown: false }} />
      <Stack.Screen name="complaints" options={{ headerShown: false }} />
      <Stack.Screen name="tracking" options={{ headerShown: false }} />
    </Stack>
  );
}
