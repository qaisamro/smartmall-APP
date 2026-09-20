import { Redirect, Stack } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { getAppDirection } from '@/src/i18n';
import { getUserRole } from '@/src/utils/roles';
import { useAuthStore } from '@/src/store/authStore';

export default function StaffLayout() {
  const colors = useColors();
  const { i18n } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const direction = getAppDirection(i18n.language);
  const options = useMemo(() => ({
    headerShown: false,
    contentStyle: { direction },
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
  }), [colors.background, colors.foreground, direction]);

  if (status === 'unavailable') return <Redirect href="/" />;
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated' && getUserRole(user) === 'customer') {
    return <Redirect href="/(customer)/(tabs)" />;
  }

  return <Stack screenOptions={options}><Stack.Screen name="index" /><Stack.Screen name="pos" /></Stack>;
}