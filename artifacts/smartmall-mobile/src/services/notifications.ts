import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '@/src/api/client';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
type NotificationsModule = typeof import('expo-notifications');
type NotificationSubscription = { remove: () => void };

let registeredAndroidToken: string | null = null;
let tokenSubscription: NotificationSubscription | null = null;
let notificationsModule: NotificationsModule | null = null;

function isExpoGoRuntime() {
  return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isExpoGoRuntime()) return null;
  notificationsModule ??= await import('expo-notifications');
  return notificationsModule;
}

async function getAndroidFcmToken(requestPermission: boolean): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (requestPermission && status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  if (deviceToken.type !== 'fcm') return null;
  return String(deviceToken.data);
}

async function registerAndroidTokenValue(token: string) {
  await apiClient.post('/push/fcm-token', {
    token,
    platform: 'android',
    app_version: Constants.expoConfig?.version ?? '1.0.0',
  });
  registeredAndroidToken = token;
}

export const notificationService = {
  async configure() {
    // Remote notifications are not available in Expo Go on Android since SDK 53.
    // Keep this service silent there so camera and other routes can still load.
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync('smartmall-updates', {
      name: 'SmartMall updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });

    this.stopTokenListener();
    tokenSubscription = Notifications.addPushTokenListener((deviceToken) => {
      if (Platform.OS !== 'android') return;
      if (deviceToken.type !== 'fcm') return;
      void registerAndroidTokenValue(String(deviceToken.data)).catch((error) => {
        if (__DEV__) console.warn('[SmartMall FCM] Android token refresh failed', error);
      });
    });
    await this.registerAndroidToken();
  },
  async registerAndroidToken() {
    try {
      const token = await getAndroidFcmToken(true);
      if (!token) return;
      await registerAndroidTokenValue(token);
    } catch (error) {
      // Push registration must never prevent the authenticated app from opening.
      if (__DEV__) console.warn('[SmartMall FCM] Android token registration failed', error);
    }
  },
  stopTokenListener() {
    tokenSubscription?.remove();
    tokenSubscription = null;
  },
  async unregisterAndroidToken() {
    this.stopTokenListener();
    if (Platform.OS !== 'android' || isExpoGoRuntime()) {
      registeredAndroidToken = null;
      return;
    }
    try {
      const token = registeredAndroidToken ?? await getAndroidFcmToken(false);
      if (!token) return;
      await apiClient.delete('/push/fcm-token', { data: { token } });
      registeredAndroidToken = null;
    } catch (error) {
      if (__DEV__) console.warn('[SmartMall FCM] Android token removal failed', error);
    }
  },
  async getPermission(): Promise<NotificationPermissionState> {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return 'undetermined';
    const result = await Notifications.getPermissionsAsync();
    return result.status;
  },
  async requestPermission(): Promise<NotificationPermissionState> {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return 'undetermined';
    const result = await Notifications.requestPermissionsAsync();
    return result.status;
  },
  addResponseListener(handler: (data: Record<string, unknown>) => void) {
    let removed = false;
    let subscription: NotificationSubscription | null = null;

    if (Platform.OS !== 'web' && !isExpoGoRuntime()) {
      void getNotificationsModule().then((Notifications) => {
        if (!Notifications || removed) return;
        subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          handler(response.notification.request.content.data ?? {});
        });
      });
    }

    return {
      remove() {
        removed = true;
        subscription?.remove();
      },
    };
  },
  async getLastResponseData(): Promise<Record<string, unknown> | null> {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification.request.content.data ?? null;
  },
};