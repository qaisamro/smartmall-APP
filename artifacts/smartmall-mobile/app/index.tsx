import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { getUserRole } from '@/src/utils/roles';
import HomeScreen from './(customer)/(tabs)';

export default function IndexScreen() {
  const authStatus = useAuthStore((state) => state.status);
  const initialize = useAuthStore((state) => state.initialize);
  const colors = useColors();
  const { t } = useTranslation();
  
  if (authStatus === 'authenticated') {
    return getUserRole(useAuthStore.getState().user) === 'customer'
      ? <Redirect href="/(customer)/(tabs)" />
      : <Redirect href="/(staff)" />;
  }
  if (authStatus === 'unavailable') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t('error.session_unavailable')}
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {t('error.session_preserved')}
        </Text>
        <AppButton label={t('common.retry')} onPress={() => void initialize()} />
      </View>
    );
  }

  if (authStatus === 'anonymous') {
    return <HomeScreen />;
  }
  
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
});
