import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSections } from '@/src/features/catalog/useCatalogHooks';
import { getAppDirection } from '@/src/i18n';
import { AppButton } from '@/src/components/AppButton';

export default function SectionsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const direction = getAppDirection(i18n.language);
  const isAr = direction === 'rtl';
  const sectionsQuery = useSections();
  const sections = sectionsQuery.data ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background, direction }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={sectionsQuery.isRefetching}
          onRefresh={() => void sectionsQuery.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={[styles.header, { direction }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
          {t('home.browse_sections')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
          {t('home.hero_subtitle')}
        </Text>
      </View>

      {sectionsQuery.isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('common.loading')}</Text>
        </View>
      ) : sectionsQuery.isError ? (
        <View style={styles.state}>
          <Feather name="alert-circle" size={30} color={colors.destructive} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('error.network')}</Text>
          <AppButton label={t('common.retry')} onPress={() => void sectionsQuery.refetch()} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.state}>
          <Feather name="grid" size={30} color={colors.mutedForeground} />
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{t('home.no_sections')}</Text>
        </View>
      ) : (
        <View style={[styles.grid, { direction }]}>
          {sections.map((section) => (
            <Pressable
              key={section.id}
              accessibilityRole="button"
              accessibilityLabel={(isAr ? section.name_ar : section.name_en) || section.name_ar}
              onPress={() => router.replace('/(customer)/(tabs)/malls')}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                  direction,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Feather name="grid" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.cardLabel, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]} numberOfLines={2}>
                {(isAr ? section.name_ar : section.name_en) || section.name_ar}
              </Text>
              <Feather name={isAr ? 'arrow-left' : 'arrow-right'} size={16} color={colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 22,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    minHeight: 132,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    lineHeight: 21,
  },
  state: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    maxWidth: 300,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});