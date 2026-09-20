import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppInput } from '@/src/components/AppInput';
import { AppButton } from '@/src/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { resetPasswordSchema } from '@/src/features/auth/authApi';
import { useResetPassword } from '@/src/features/auth/useAuthHooks';
import { handleFormApiError } from '@/src/utils/errorHandling';
import type { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const resetMutation = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(null);
  const params = useLocalSearchParams();

  const { control, handleSubmit, formState: { errors }, setError } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      phone: (params.phone as string) || '',
      token: (params.token as string) || '',
      password: '', 
      password_confirmation: '' 
    }
  });

  const onSubmit = (data: ResetPasswordForm) => {
    setServerError(null);
    resetMutation.mutate(data, {
      onSuccess: () => router.replace('/(auth)/login'),
      onError: (error) => setServerError(handleFormApiError(error, setError, t)),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthScreenHeader />
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        bottomOffset={20}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('auth.set_new_password')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, marginTop: 8 }]}>
            {params.phone ? t('auth.reset_sent') : t('auth.reset_missing_token')}
          </Text>
        </View>

        <View style={styles.form}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput
              label={t('auth.phone')}
              autoCapitalize="none"
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.phone?.message ? t(errors.phone.message) : undefined}
            />
          )}
        />

        <Controller
          control={control}
          name="token"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput
              label={t('auth.reset_token')}
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.token?.message ? t(errors.token.message) : undefined}
            />
          )}
        />
        
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput
              label={t('auth.new_password')}
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message ? t(errors.password.message) : undefined}
            />
          )}
        />
        
        <Controller
          control={control}
          name="password_confirmation"
          render={({ field: { onChange, onBlur, value } }) => (
            <AppInput
              label={t('auth.password_confirmation')}
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={
                errors.password_confirmation?.message
                  ? t(errors.password_confirmation.message)
                  : undefined
              }
            />
          )}
        />

          <AppButton
            label={t('auth.reset_password')}
            onPress={handleSubmit(onSubmit)}
            loading={resetMutation.isPending}
          />
          {serverError && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {serverError}
            </Text>
          )}
        </View>
      </KeyboardAwareScrollViewCompat>
      <GuestNavigationBar />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  form: {
    gap: 8,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  }
});
