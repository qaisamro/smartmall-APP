import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/src/api/queryClient';
import { getAppDirection, i18nReady } from '@/src/i18n';
import { useAuthStore } from '@/src/store/authStore';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';
import { getAppRouteFromUrl, getInitialAppLink, getNotificationRoute } from '@/src/services/deepLinks';
import { notificationService } from '@/src/services/notifications';
import { getUserRole } from '@/src/utils/roles';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
function RootLayoutNav() {
  const { i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const screenOptions = useMemo(
    () => ({ headerShown: false, contentStyle: { direction } }),
    [direction],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(staff)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const { i18n } = useTranslation();
  const initialize = useAuthStore((state) => state.initialize);
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const userRole = getUserRole(user);
  const [localizationReady, setLocalizationReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (
      (fontsLoaded || fontError) &&
      localizationReady
    ) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded, localizationReady]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void i18nReady
      .then(() => setLocalizationReady(true))
      .catch(() => setLocalizationReady(true));
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let active = true;
    const navigate = (route: string | null) => {
      if (active && userRole === 'customer' && route) router.push(route as never);
    };

    void notificationService.configure();
    const notificationSubscription = notificationService.addResponseListener((data) => {
      navigate(getNotificationRoute(data));
    });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      navigate(getAppRouteFromUrl(url));
    });

    void Promise.all([getInitialAppLink(), notificationService.getLastResponseData()]).then(([url, data]) => {
      if (url) navigate(getAppRouteFromUrl(url));
      if (data) navigate(getNotificationRoute(data));
    });

    return () => {
      active = false;
      notificationSubscription.remove();
      linkingSubscription.remove();
      notificationService.stopTokenListener();
    };
  }, [authStatus, userRole]);

  useEffect(() => {
    if (authStatus === 'anonymous') {
      queryClient.clear();
    }
  }, [authStatus]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  if (!localizationReady || authStatus === 'idle' || authStatus === 'restoring') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#ffffff' }}>
        <ActivityIndicator color="#2563eb" />
        <Text style={{ color: '#64748b', fontFamily: 'Inter_500Medium' }}>{i18n.t('common.loading')}</Text>
      </View>
    );
  }

  const direction = getAppDirection(i18n.language);

  return (
    <SafeAreaProvider style={{ direction }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, direction }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
