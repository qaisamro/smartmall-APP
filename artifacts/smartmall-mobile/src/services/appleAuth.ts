import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithAppleLocally(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('apple_ios_only');
  }

  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('apple_unavailable');
  }

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      throw new Error('apple_cancelled');
    }
    throw new Error('apple_failed');
  }

  if (!credential.user || !credential.identityToken) {
    throw new Error('apple_missing_identity_token');
  }

  // The Laravel API currently has no Apple endpoint that can verify this
  // identity token and exchange it for a SmartMall Sanctum token. Do not
  // persist the Apple token as an API access token or mark the user logged in.
}