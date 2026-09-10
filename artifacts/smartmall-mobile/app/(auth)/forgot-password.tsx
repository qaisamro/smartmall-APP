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
import type { z } from 'zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { router } from 'expo-router';
import { AuthScreenHeader, GuestNavigationBar } from '@/src/components/AuthGuestNavigation';
import {
  startWhatsAppVerification,
  type WhatsAppVerification,
} from '@/src/services/whatsappVerification';

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const [whatsappVerification, setWhatsappVerification] = useState<WhatsAppVerification | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { phone: '' }
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    setWhatsappError(null);
    setIsOpeningWhatsApp(true);
    void startWhatsAppVerification({ kind: 'reset', phone: data.phone })
      .then((verification) => {
        setPendingPhone(data.phone);
        setWhatsappVerification(verification);
      })
      .catch((error: unknown) => {
        setWhatsappError(
          error instanceof Error && error.message === 'whatsapp_unavailable'
            ? t('auth.whatsapp_open_failed')
            : t('auth.whatsapp_open_failed'),
        );
      })
      .finally(() => setIsOpeningWhatsApp(false));
  };

  const continueToReset = () => {
    if (!whatsappVerification || !pendingPhone) return;
    router.replace({
      pathname: '/(auth)/reset-password',
      params: {
        phone: pendingPhone,
        verificationId: whatsappVerification.verificationId,
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

          {whatsappVerification ? (
            <>
              <Text style={[styles.whatsappNotice, { color: colors.mutedForeground }]}>
                {t('auth.whatsapp_reset_sent')}
              </Text>
              <AppButton
                label={t('auth.whatsapp_sent_continue')}
                onPress={continueToReset}
                testID="forgot-whatsapp-continue"
              />
            </>
          ) : (
            <AppButton
              label={t('auth.reset_via_whatsapp')}
              onPress={handleSubmit(onSubmit)}
              loading={isOpeningWhatsApp}
              testID="forgot-whatsapp-start"
            />
          )}
          {whatsappError && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {whatsappError}
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
  whatsappNotice: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
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
