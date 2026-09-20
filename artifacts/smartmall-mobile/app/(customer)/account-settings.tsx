import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/src/components/AppButton';
import { AppInput } from '@/src/components/AppInput';
import {
  useCustomerProfile,
  useProfileCompletion,
  useUpdateCustomerPassword,
  useUpdateCustomerProfileDetails,
} from '@/src/features/profile/useProfileHooks';
import { formatNumber } from '@/src/utils/numberFormat';

type Gender = 'male' | 'female' | '';

export default function AccountSettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isAr = i18n.language.startsWith('ar');
  const profileQuery = useCustomerProfile();
  const completionQuery = useProfileCompletion();
  const updateProfile = useUpdateCustomerProfileDetails();
  const updatePassword = useUpdateCustomerPassword();
  const profile = profileQuery.data;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    birthdate: '',
    gender: '' as Gender,
  });
  const [password, setPassword] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      whatsapp: profile.whatsapp ?? '',
      address: profile.address ?? '',
      birthdate: profile.birthdate?.slice(0, 10) ?? '',
      gender: profile.gender ?? '',
    });
  }, [profile]);

  const saveProfile = () => {
    setMessage(null);
    updateProfile.mutate(
      {
        ...form,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        address: form.address.trim(),
        birthdate: form.birthdate || undefined,
        gender: form.gender || undefined,
      },
      { onSuccess: () => setMessage(t('profile.settings_saved')) },
    );
  };

  const savePassword = () => {
    setMessage(null);
    if (password.new_password !== password.new_password_confirmation) {
      setMessage(t('validation.password_match'));
      return;
    }
    updatePassword.mutate(password, {
      onSuccess: () => {
        setPassword({ current_password: '', new_password: '', new_password_confirmation: '' });
        setMessage(t('profile.password_saved'));
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, direction: isAr ? 'rtl' : 'ltr' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={isAr ? 'arrow-right' : 'arrow-left'} size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.title, { color: colors.foreground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.settings_title')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? 'right' : 'left' }]}>{t('profile.settings_subtitle')}</Text>
          </View>
        </View>

        {completionQuery.data ? (
          <View style={[styles.completion, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.completionTop}>
              <Text style={[styles.label, { color: colors.foreground }]}>{t('profile.completion')}</Text>
              <Text style={[styles.percent, { color: colors.primary }]}>{formatNumber(completionQuery.data.percentage)}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progress, { backgroundColor: colors.primary, width: `${completionQuery.data.percentage}%` }]} /></View>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>{t('profile.completion_detail', { filled: formatNumber(completionQuery.data.filled_fields), total: formatNumber(completionQuery.data.total_fields) })}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('profile.personal_information')}</Text>
          <AppInput label={t('profile.name')} value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <AppInput label={t('profile.email')} value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} keyboardType="email-address" autoCapitalize="none" />
          <AppInput label={t('profile.phone')} value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
          <AppInput label={t('profile.whatsapp')} value={form.whatsapp} onChangeText={(value) => setForm((current) => ({ ...current, whatsapp: value }))} keyboardType="phone-pad" />
          <AppInput label={t('profile.address')} value={form.address} onChangeText={(value) => setForm((current) => ({ ...current, address: value }))} />
          <AppInput label={t('profile.birthdate')} value={form.birthdate} onChangeText={(value) => setForm((current) => ({ ...current, birthdate: value }))} placeholder="YYYY-MM-DD" />
          <Text style={[styles.label, { color: colors.foreground }]}>{t('profile.gender')}</Text>
          <View style={styles.genderRow}>
            {(['male', 'female'] as const).map((gender) => (
              <Pressable key={gender} onPress={() => setForm((current) => ({ ...current, gender }))} style={[styles.genderOption, { borderColor: form.gender === gender ? colors.primary : colors.border, backgroundColor: form.gender === gender ? colors.primarySoft : colors.card }]}>
                <Text style={[styles.genderText, { color: form.gender === gender ? colors.primary : colors.foreground }]}>{t(`profile.${gender}`)}</Text>
              </Pressable>
            ))}
          </View>
          <AppButton label={t('profile.save_changes')} onPress={saveProfile} loading={updateProfile.isPending} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('profile.security')}</Text>
          <AppInput label={t('profile.current_password')} value={password.current_password} onChangeText={(value) => setPassword((current) => ({ ...current, current_password: value }))} secureTextEntry />
          <AppInput label={t('profile.new_password')} value={password.new_password} onChangeText={(value) => setPassword((current) => ({ ...current, new_password: value }))} secureTextEntry />
          <AppInput label={t('profile.confirm_password')} value={password.new_password_confirmation} onChangeText={(value) => setPassword((current) => ({ ...current, new_password_confirmation: value }))} secureTextEntry />
          <AppButton label={t('profile.change_password')} onPress={savePassword} loading={updatePassword.isPending} variant="secondary" />
        </View>

        {message ? <Text style={[styles.message, { color: updateProfile.isError || updatePassword.isError ? colors.destructive : colors.success }]}>{message}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 4 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 8 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  completion: { borderRadius: 18, borderWidth: 1, padding: 15, gap: 9 },
  completionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percent: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  progressTrack: { height: 8, borderRadius: 5, overflow: 'hidden' },
  progress: { height: 8, borderRadius: 5 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  genderOption: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  genderText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  message: { fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center', paddingBottom: 8 },
});