import { Stack, Redirect } from 'expo-router';
import { useMemo } from 'react';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from 'react-i18next';
import { getAppDirection } from '@/src/i18n';
import { getUserRole } from '@/src/utils/roles';

export default function AuthLayout() {
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const direction = getAppDirection(i18n.language);
  const status = useAuthStore(state => state.status);
  const user = useAuthStore(state => state.user);
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
  
  if (status === 'authenticated') {
    return getUserRole(user) === 'customer'
      ? <Redirect href="/(customer)/(tabs)" />
      : <Redirect href="/(staff)" />;
  }
  if (status === 'unavailable') {
    return <Redirect href="/" />;
  }
  
  return (
    <Stack
      screenOptions={screenOptions}
    >
      <Stack.Screen name="login" options={{ title: t('auth.sign_in'), headerShown: false }} />
      <Stack.Screen name="register" options={{ title: t('auth.sign_up'), headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.reset_password'), headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ title: t('auth.set_new_password'), headerShown: false }} />
    </Stack>
  );
}
