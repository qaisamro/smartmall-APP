import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: t('not_found.title') }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={64} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>{t('not_found.message')}</Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>{t('not_found.back')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginTop: 16,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
});
