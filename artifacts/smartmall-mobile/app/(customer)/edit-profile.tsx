import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppInput } from '@/src/components/AppInput';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/src/features/profile/useProfileHooks';
import { customerProfileUpdateSchema, type CustomerProfileUpdate } from '@/src/features/profile/profileApi';
import { handleFormApiError } from '@/src/utils/errorHandling';

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const profileQuery = useCustomerProfile();
  const updateMutation = useUpdateCustomerProfile();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isAr = i18n.language.startsWith('ar');
  const direction: 'rtl' | 'ltr' = isAr ? 'rtl' : 'ltr';
  const profile = profileQuery.data ?? user;

  const { control, handleSubmit, reset, formState: { errors }, setError } = useForm<CustomerProfileUpdate>({
    resolver: zodResolver(customerProfileUpdateSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name ?? '', email: profile.email ?? '' });
    }
  }, [profile, reset]);

  const onSubmit = (data: CustomerProfileUpdate) => {
    setServerError(null);
    setSaved(false);
    updateMutation.mutate(data, {
      onSuccess: () => setSaved(true),
      onError: (error) => setServerError(handleFormApiError(error, setError, t)),
    });
  };

  if (profileQuery.isLoading && !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityHeader direction={direction} onBack={() => router.back()} title={t('profile.edit_title')} colors={colors} isAr={isAr} />
        <View style={styles.loadingState}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (profileQuery.isError && !profile) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityHeader direction={direction} onBack={() => router.back()} title={t('profile.edit_title')} colors={colors} isAr={isAr} />
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={28} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>{t('profile.load_error')}</Text>
          <Pressable onPress={() => void profileQuery.refetch()} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>{t('profile.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28, direction }]}
        bottomOffset={24}
      >
        <ActivityHeader direction={direction} onBack={() => router.back()} title={t('profile.edit_title')} colors={colors} isAr={isAr} />
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.edit_subtitle')}</Text>

        {saved ? (
          <View style={[styles.message, { backgroundColor: colors.primarySoft }]}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.messageText, { color: colors.success }]}>{t('profile.saved')}</Text>
          </View>
        ) : null}
        {serverError ? (
          <View style={[styles.message, { backgroundColor: colors.destructive + '15' }]}>
            <Feather name="alert-circle" size={18} color={colors.destructive} />
            <Text style={[styles.messageText, { color: colors.destructive }]}>{serverError}</Text>
          </View>
        ) : null}

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label={t('profile.name')}
                placeholder={t('profile.name')}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message ? t(errors.name.message) : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label={t('profile.email')}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message ? t(errors.email.message) : undefined}
              />
            )}
          />
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
            style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary, opacity: pressed || updateMutation.isPending ? 0.7 : 1 }]}
          >
            {updateMutation.isPending ? <Feather name="loader" size={18} color={colors.primaryForeground} /> : null}
            <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>{t('profile.save_changes')}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ActivityHeader({
  direction,
  onBack,
  title,
  colors,
  isAr,
}: {
  direction: 'rtl' | 'ltr';
  onBack: () => void;
  title: string;
  colors: ReturnType<typeof useColors>;
  isAr: boolean;
}) {
  return (
    <View style={[styles.header, { direction }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isAr ? 'رجوع' : 'Back'}
        onPress={onBack}
        hitSlop={8}
        style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={20} color={colors.foreground} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 22 },
  formCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 8 },
  saveButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  saveButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  message: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  messageText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  errorCard: { margin: 20, minHeight: 240, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  errorText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' },
  retryButton: { minHeight: 42, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});