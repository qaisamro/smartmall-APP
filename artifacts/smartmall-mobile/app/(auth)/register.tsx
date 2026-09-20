import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppInput } from '@/src/components/AppInput';
import { AppButton } from '@/src/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { registerSchema } from '@/src/features/auth/authApi';
import { useGoogleLogin } from '@/src/features/auth/useAuthHooks';
import type { z } from 'zod';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const googleLoginMutation = useGoogleLogin();
  const [smsError, setSmsError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '', password_confirmation: '' }
  });

  const onSubmit = (_data: RegisterForm) => {
    setSmsError(t('auth.sms_registration_unavailable'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthScreenHeader />
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 112 }]}
        bottomOffset={20}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('auth.sign_up')}</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label={t('auth.name')}
                placeholder="John Doe"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.name?.message ? t(errors.name.message) : undefined}
              />
            )}
          />

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

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label={t('auth.password')}
                placeholder="••••••••"
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
                placeholder="••••••••"
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
            label={t('auth.register_with_sms')}
            onPress={handleSubmit(onSubmit)}
            testID="register-sms-start"
          />
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>{t('auth.or')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>
          <GoogleSignInButton
            loading={googleLoginMutation.isPending}
            onPress={() => googleLoginMutation.mutate()}
          />
          {(smsError || googleLoginMutation.error) && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {smsError ??
                (googleLoginMutation.error instanceof Error &&
                googleLoginMutation.error.message === 'google_native_only'
                  ? t('auth.google_native_only')
                  : googleLoginMutation.error instanceof Error &&
                      googleLoginMutation.error.message === 'google_cancelled'
                    ? t('auth.google_cancelled')
                    : t('auth.google_failed'))}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t('auth.have_account')}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.loginButton}>
              <Text style={[styles.loginText, { color: colors.primary }]}>{t('auth.sign_in')}</Text>
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
    padding: 16,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  form: {
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 6,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  loginButton: {
    paddingVertical: 4,
  },
  loginText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});
