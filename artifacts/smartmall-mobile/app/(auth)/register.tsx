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
import { useRegister } from '@/src/features/auth/useAuthHooks';
import { useGoogleLogin } from '@/src/features/auth/useAuthHooks';
import { useAppleLogin } from '@/src/features/auth/useAuthHooks';
import { handleFormApiError } from '@/src/utils/errorHandling';
import type { z } from 'zod';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import {
  startWhatsAppVerification,
  verifyWhatsAppVerification,
  type WhatsAppVerification,
} from '@/src/services/whatsappVerification';
import {
  AppleSignInButton,
  FacebookSignInButton,
  GoogleSignInButton,
} from '@/src/components/GoogleSignInButton';

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const registerMutation = useRegister();
  const googleLoginMutation = useGoogleLogin();
  const appleLoginMutation = useAppleLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const [facebookInfo, setFacebookInfo] = useState<string | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const [isVerifyingWhatsApp, setIsVerifyingWhatsApp] = useState(false);
  const [whatsappVerification, setWhatsappVerification] = useState<WhatsAppVerification | null>(null);
  const [pendingRegisterData, setPendingRegisterData] = useState<RegisterForm | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const { control, handleSubmit, formState: { errors }, setError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', phone: '', password: '', password_confirmation: '' }
  });

  const onSubmit = (data: RegisterForm) => {
    setServerError(null);
    registerMutation.mutate(data, {
      onError: (error) => {
        setServerError(handleFormApiError(error, setError, t));
      }
    });
  };

  const onWhatsAppVerification = async (data: RegisterForm) => {
    setServerError(null);
    setWhatsappError(null);
    setIsOpeningWhatsApp(true);

    try {
      const verification = await startWhatsAppVerification({
        kind: 'register',
        name: data.name,
        phone: data.phone,
      });
      setPendingRegisterData(data);
      setWhatsappVerification(verification);
    } catch (error) {
      setWhatsappError(
        error instanceof Error && error.message === 'whatsapp_unavailable'
          ? t('auth.whatsapp_open_failed')
          : t('auth.whatsapp_open_failed'),
      );
    } finally {
      setIsOpeningWhatsApp(false);
    }
  };

  const continueAfterWhatsApp = async () => {
    if (!pendingRegisterData || !whatsappVerification || !verificationCode.trim()) return;
    setWhatsappError(null);
    setIsVerifyingWhatsApp(true);

    try {
      const verificationToken = await verifyWhatsAppVerification({
        kind: 'register',
        phone: pendingRegisterData.phone,
        verificationId: whatsappVerification.verificationId,
        code: verificationCode,
      });
      onSubmit({
        ...pendingRegisterData,
        whatsapp_verification_token: verificationToken,
      });
    } catch (error) {
      setWhatsappError(
        error instanceof Error && error.message === 'whatsapp_verification_unavailable'
          ? t('auth.whatsapp_verification_unavailable')
          : error instanceof Error ? error.message : t('error.network'),
      );
    } finally {
      setIsVerifyingWhatsApp(false);
    }
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

          {whatsappVerification ? (
            <>
              <Text style={[styles.whatsappNotice, { color: colors.mutedForeground }]}>
                {t('auth.whatsapp_verification_sent')}
              </Text>
              <AppInput
                label={t('auth.reset_token')}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
                value={verificationCode}
                onChangeText={setVerificationCode}
              />
              <AppButton
                label={t('auth.whatsapp_sent_continue')}
                onPress={continueAfterWhatsApp}
                loading={isVerifyingWhatsApp || registerMutation.isPending}
                testID="register-whatsapp-continue"
              />
              <Pressable
                style={styles.editVerificationButton}
                onPress={() => {
                  setWhatsappVerification(null);
                  setPendingRegisterData(null);
                  setVerificationCode('');
                }}
              >
                <Text style={[styles.editVerificationText, { color: colors.primary }]}>
                  {t('auth.whatsapp_edit_data')}
                </Text>
              </Pressable>
            </>
          ) : (
            <AppButton
              label={t('auth.confirm_account_whatsapp')}
              onPress={handleSubmit(onWhatsAppVerification)}
              loading={isOpeningWhatsApp}
              testID="register-whatsapp-start"
            />
          )}
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
          {(serverError || whatsappError || googleLoginMutation.error || facebookInfo || appleLoginMutation.error) && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {whatsappError ??
                facebookInfo ??
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
  whatsappNotice: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 4,
  },
  editVerificationButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editVerificationText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
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
