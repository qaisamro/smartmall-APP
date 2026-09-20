import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'smartmall.access-token';
let webSessionToken: string | null = null;

export const secureAuthStorage = {
  getAccessToken: async () =>
    Platform.OS === 'web'
      ? webSessionToken
      : SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  setAccessToken: async (token: string) => {
    if (Platform.OS === 'web') {
      webSessionToken = token;
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  clearAccessToken: async () => {
    if (Platform.OS === 'web') {
      webSessionToken = null;
      return;
    }
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};