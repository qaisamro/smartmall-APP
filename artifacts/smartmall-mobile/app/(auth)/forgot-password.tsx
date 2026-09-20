import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppInput } from '@/src/components/AppInput';
import { AppButton } from '@/src/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { forgotPasswordSchema } from '@/src/features/auth/authApi';
import { useForgotPassword } from '@/src/features/auth/useAuthHooks';
import { handleFormApiError } from '@/src/utils/errorHandling';
import type { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { router } from 'expo-router';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const forgotPasswordMutation = useForgotPassword();
  const [serverError, setServerError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, setError } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { phone: '' }
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    setServerError(null);
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        router.replace({
          pathname: '/(auth)/reset-password',
          params: { phone: data.phone },
        });
      },
      onError: (error) => {
        setServerError(handleFormApiError(error, setError, t));
      },
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t('auth.reset_password')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t('auth.reset_instructions')}
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label={t('auth.phone')}
                placeholder={t('auth.phone_placeholder')}
                autoCapitalize="none"
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.phone?.message ? t(errors.phone.message) : undefined}
              />
            )}
          />

          <AppButton
            label={t('auth.send_reset_link')}
            onPress={handleSubmit(onSubmit)}
            loading={forgotPasswordMutation.isPending}
            testID="forgot-sms-start"
          />
          {serverError && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {serverError}
            </Text>
          )}
          <Link href="/(auth)/reset-password" asChild>
            <Pressable style={styles.tokenLink}>
              <Text style={[styles.tokenLinkText, { color: colors.primary }]}>
                {t('auth.have_reset_token')}
              </Text>
            </Pressable>
          </Link>
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
    marginBottom: 8,
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
  },
  successText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  tokenLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  tokenLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
