import { Feather } from '@expo/vector-icons';
import { Appearance, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuthStore } from '@/src/store/authStore';
import { useLogout } from '@/src/features/auth/useAuthHooks';
import { useCustomerProfile } from '@/src/features/profile/useProfileHooks';
import { changeAppLanguage } from '@/src/i18n';
import type { CustomerProfile } from '@/src/features/profile/profileApi';
import { formatPhone } from '@/src/utils/numberFormat';

function getInitials(name: string | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function getStatusKey(profile: CustomerProfile | null) {
  if (profile?.status) return profile.status.toLowerCase() === 'active' ? 'active' : 'inactive';
  if (profile?.is_active === false || profile?.is_active === 0) return 'inactive';
  return 'active';
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const profileQuery = useCustomerProfile();
  const profile = profileQuery.data ?? user;
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const selectedTheme = systemScheme === 'dark' ? 'dark' : 'light';
  const statusKey = getStatusKey(profile);

  const selectLanguage = (language: 'ar' | 'en') => {
    if (i18n.language.startsWith(language)) return;
    void changeAppLanguage(language);
  };

  const selectTheme = (theme: 'light' | 'dark') => {
    Appearance.setColorScheme(theme);
  };

  const renderRow = ({
    icon,
    label,
    subtitle,
    onPress,
    trailing,
    destructive = false,
  }: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    subtitle?: string;
    onPress?: () => void;
    trailing?: React.ReactNode;
    destructive?: boolean;
  }) => {
    const content = (
      <>
        <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.destructive + '18' : colors.primarySoft }]}>
          <Feather name={icon} size={18} color={destructive ? colors.destructive : colors.primary} />
        </View>
        <View style={[styles.rowCopy, { direction }]}>
          <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ?? <Feather name={isAr ? 'chevron-left' : 'chevron-right'} size={18} color={colors.mutedForeground} />}
      </>
    );

    if (!onPress) {
      return <View style={[styles.row, { direction }]}>{content}</View>;
    }

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={logoutMutation.isPending && destructive}
        style={({ pressed }) => [styles.row, { direction, opacity: pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  };

  if (profileQuery.isLoading && !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.skeletonAvatar, { backgroundColor: colors.muted }]} />
          <View style={[styles.skeletonLine, { backgroundColor: colors.muted }]} />
          <View style={[styles.skeletonSmallLine, { backgroundColor: colors.muted }]} />
        </View>
      </View>
    );
  }

  if (profileQuery.isError && !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.title')}</Text>
        </View>
        <View style={[styles.stateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={28} color={colors.destructive} />
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>{t('profile.load_error')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void profileQuery.refetch()}
            style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
          >
            <Text style={[styles.retryText, { color: colors.primaryForeground }]}>{t('profile.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 110, direction }]}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isRefetching}
            onRefresh={() => void profileQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { direction }]}>
          <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.subtitle')}</Text>
        </View>

        <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border, direction }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{getInitials(profile?.name)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={[styles.identityName, { color: colors.foreground }]} numberOfLines={1}>{profile?.name || t('profile.no_profile')}</Text>
            {profile?.email ? <Text style={[styles.identityEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{profile.email}</Text> : null}
            {profile?.phone ? <Text style={[styles.identityEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{formatPhone(profile.phone)}</Text> : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusKey === 'active' ? colors.primarySoft : colors.warningBackground }]}>
            <View style={[styles.statusDot, { backgroundColor: statusKey === 'active' ? colors.success : colors.warning }]} />
            <Text style={[styles.statusText, { color: statusKey === 'active' ? colors.primary : colors.warning }]}>{t(`profile.${statusKey}`)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.account')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderRow({
            icon: 'edit-3',
            label: t('profile.edit_profile'),
            subtitle: t('profile.edit_profile_subtitle'),
            onPress: () => router.push('/(customer)/edit-profile'),
          })}
          {renderRow({
            icon: 'settings',
            label: t('profile.account_settings'),
            subtitle: t('profile.account_settings_subtitle'),
            onPress: () => router.push('/(customer)/account-settings'),
          })}
          {profile?.address ? renderRow({ icon: 'map-pin', label: t('profile.address'), subtitle: profile.address }) : null}
          {profile?.whatsapp ? renderRow({ icon: 'message-circle', label: t('profile.whatsapp'), subtitle: formatPhone(profile.whatsapp) }) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.preferences')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderRow({
            icon: 'globe',
            label: t('profile.language'),
            trailing: (
              <View style={[styles.segmented, { backgroundColor: colors.muted, direction }]}>
                {(['en', 'ar'] as const).map((language) => (
                  <Pressable
                    key={language}
                    accessibilityRole="button"
                    accessibilityState={{ selected: i18n.language.startsWith(language) }}
                    onPress={() => selectLanguage(language)}
                    style={[styles.segment, i18n.language.startsWith(language) ? { backgroundColor: colors.primary } : null]}
                  >
                    <Text style={[styles.segmentText, { color: i18n.language.startsWith(language) ? colors.primaryForeground : colors.mutedForeground }]}>
                      {language === 'en' ? 'EN' : 'ع'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ),
          })}
          {renderRow({
            icon: 'sun',
            label: t('profile.theme'),
            trailing: (
              <View style={[styles.segmented, { backgroundColor: colors.muted, direction }]}>
                {(['light', 'dark'] as const).map((theme) => (
                  <Pressable
                    key={theme}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedTheme === theme }}
                    onPress={() => selectTheme(theme)}
                    style={[styles.segment, selectedTheme === theme ? { backgroundColor: colors.primary } : null]}
                  >
                    <Feather name={theme === 'light' ? 'sun' : 'moon'} size={14} color={selectedTheme === theme ? colors.primaryForeground : colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            ),
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.activity')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderRow({ icon: 'shopping-bag', label: t('profile.orders'), subtitle: t('profile.orders_subtitle'), onPress: () => router.push('/(customer)/orders') })}
          {renderRow({ icon: 'truck', label: t('profile.tracking'), subtitle: t('profile.tracking_subtitle'), onPress: () => router.push('/(customer)/tracking') })}
          {renderRow({ icon: 'message-square', label: t('profile.complaints'), subtitle: t('profile.complaints_subtitle'), onPress: () => router.push('/(customer)/complaints') })}
          {renderRow({ icon: 'bell', label: t('profile.notifications'), subtitle: t('profile.notifications_subtitle'), onPress: () => router.push('/(customer)/notifications') })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.other')}</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {renderRow({
            icon: 'log-out',
            label: t('common.logout'),
            subtitle: t('profile.logout_subtitle'),
            destructive: true,
            onPress: () => logoutMutation.mutate(),
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 10 },
  header: { gap: 4, marginBottom: 14 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  identityCard: { borderWidth: 1, borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  identityCopy: { flex: 1, gap: 4 },
  identityName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  identityEmail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 10, marginBottom: 2 },
  sectionCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  row: { minHeight: 70, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  rowSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  segmented: { borderRadius: 10, padding: 3, flexDirection: 'row', gap: 2 },
  segment: { minWidth: 30, minHeight: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  segmentText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  stateCard: { margin: 20, minHeight: 240, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  stateTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  retryButton: { borderRadius: 12, paddingHorizontal: 18, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  loadingCard: { marginHorizontal: 20, minHeight: 230, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  skeletonTitle: { width: 130, height: 26, borderRadius: 8, backgroundColor: '#e2e8f0' },
  skeletonSubtitle: { width: 190, height: 14, borderRadius: 6, backgroundColor: '#e2e8f0' },
  skeletonAvatar: { width: 68, height: 68, borderRadius: 22 },
  skeletonLine: { width: 150, height: 18, borderRadius: 7 },
  skeletonSmallLine: { width: 100, height: 12, borderRadius: 6 },
});