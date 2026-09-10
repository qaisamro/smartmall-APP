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
import { loginSchema } from '@/src/features/auth/authApi';
import { useLogin } from '@/src/features/auth/useAuthHooks';
import { useGoogleLogin } from '@/src/features/auth/useAuthHooks';
import { useAppleLogin } from '@/src/features/auth/useAuthHooks';
import { handleFormApiError } from '@/src/utils/errorHandling';
import type { z } from 'zod';
import { Image } from 'expo-image';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import {
  AppleSignInButton,
  FacebookSignInButton,
  GoogleSignInButton,
} from '@/src/components/GoogleSignInButton';

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();
  const appleLoginMutation = useAppleLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const [facebookInfo, setFacebookInfo] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, setError } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' }
  });

  const onSubmit = (data: LoginForm) => {
    setServerError(null);
    loginMutation.mutate(data, {
      onError: (error) => {
        setServerError(handleFormApiError(error, setError, t));
      }
    });
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
          <Image
            source={require('@/assets/images/smartmall-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.title, { color: colors.foreground }]}>{t('auth.welcome')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('auth.login_subtitle')}</Text>
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

          <View style={styles.forgotPasswordContainer}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text style={[styles.forgotPassword, { color: colors.primary }]}>
                  {t('auth.forgot_password')}
                </Text>
              </Pressable>
            </Link>
          </View>

          <AppButton
            label={t('auth.sign_in')}
            onPress={handleSubmit(onSubmit)}
            loading={loginMutation.isPending}
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
          <FacebookSignInButton onPress={() => setFacebookInfo(t('auth.facebook_unavailable'))} />
          <AppleSignInButton
            loading={appleLoginMutation.isPending}
            onPress={() => appleLoginMutation.mutate()}
          />
          {(serverError || googleLoginMutation.error || facebookInfo || appleLoginMutation.error) && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {facebookInfo ??
                (appleLoginMutation.error instanceof Error
                  ? appleLoginMutation.error.message === 'apple_ios_only'
                    ? t('auth.apple_ios_only')
                    : appleLoginMutation.error.message === 'apple_cancelled'
                      ? t('auth.apple_cancelled')
                      : appleLoginMutation.error.message === 'apple_unavailable'
                        ? t('auth.apple_unavailable')
                        : appleLoginMutation.error.message === 'apple_missing_identity_token'
                          ? t('auth.apple_failed')
                          : t('auth.apple_server_unavailable')
                  : null) ??
                serverError ??
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
            {t('auth.dont_have_account')}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable style={styles.signupButton}>
              <Text style={[styles.signupText, { color: colors.primary }]}>{t('auth.sign_up')}</Text>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 112,
    height: 112,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 6,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPassword: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
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
  signupButton: {
    paddingVertical: 4,
  },
  signupText: {
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
