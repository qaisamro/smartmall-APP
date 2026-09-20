import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

type GoogleSignInButtonProps = {
  loading?: boolean;
  onPress: () => void;
};

function GoogleMark() {
  return (
    <View style={styles.googleMark} accessibilityElementsHidden>
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
          fill="#4285F4"
          d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42Z"
        />
        <Path
          fill="#34A853"
          d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.75Z"
        />
        <Path
          fill="#FBBC05"
          d="M6.53 13.84a5.86 5.86 0 0 1 0-3.68V7.63H3.28a9.75 9.75 0 0 0 0 8.74l3.25-2.53Z"
        />
        <Path
          fill="#EA4335"
          d="M12 6.13c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.17 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 7.85 9.46 6.13 12 6.13Z"
        />
      </Svg>
    </View>
  );
}

export function GoogleSignInButton({ loading = false, onPress }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.google_sign_in')}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed || loading ? 0.72 : 1,
        },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.foreground} /> : <GoogleMark />}
      <Text style={[styles.label, { color: colors.foreground }]}>{t('auth.google_sign_in')}</Text>
    </Pressable>
  );
}

type FacebookSignInButtonProps = {
  onPress: () => void;
};

export function FacebookSignInButton({ onPress }: FacebookSignInButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.facebook_sign_in')}
      onPress={onPress}
      style={({ pressed }) => [styles.facebookButton, { opacity: pressed ? 0.78 : 1 }]}
    >
      <FontAwesome name="facebook" size={20} color="#FFFFFF" />
      <Text style={styles.facebookLabel}>{t('auth.facebook_sign_in')}</Text>
    </Pressable>
  );
}

type AppleSignInButtonProps = {
  loading?: boolean;
  onPress: () => void;
};

export function AppleSignInButton({ loading = false, onPress }: AppleSignInButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.apple_sign_in')}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.appleButton,
        { opacity: pressed || loading ? 0.78 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <FontAwesome name="apple" size={21} color="#FFFFFF" />
      )}
      <Text style={styles.appleLabel}>{t('auth.apple_sign_in')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  googleMark: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  facebookButton: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: '#1877F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  facebookLabel: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  appleButton: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  appleLabel: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});