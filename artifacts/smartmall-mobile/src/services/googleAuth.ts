import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { environment } from '@/src/config/environment';
import { getGoogleAuthUrl } from '@/src/features/auth/authApi';

WebBrowser.maybeCompleteAuthSession();

function getGoogleCallbackUrl() {
  const apiOrigin = new URL(environment.apiBaseUrl).origin;
  return new URL('/auth/google/callback', apiOrigin).toString();
}

export async function signInWithGoogle(): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('google_native_only');
  }

  const { url } = await getGoogleAuthUrl();
  const result = await WebBrowser.openAuthSessionAsync(url, getGoogleCallbackUrl());

  if (result.type !== 'success') {
    throw new Error('google_cancelled');
  }

  const callbackUrl = new URL(result.url);
  const error = callbackUrl.searchParams.get('error');
  if (error) {
    throw new Error(`google_${error}`);
  }

  const token = callbackUrl.searchParams.get('token');
  if (!token) {
    throw new Error('google_missing_token');
  }

  return token;
}