import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/api';

// Show notifications as banners even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Asks permission, gets the Expo push token for this phone and saves it on the backend
 * (POST /api/partner/push-token). Safe to call on every login / app start.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null; // push is not supported on web
    if (!Device.isDevice) {
      console.log('[Push] Emulator detected - push notifications need a real phone');
      return null;
    }

    if (Platform.OS === 'android') {
      // Must match channelId used by the backend (pushNotification.service.js)
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      console.log('[Push] Notification permission denied');
      return null;
    }

    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;

    let token: string | null = null;
    try {
      const { data } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = data;
    } catch (expoErr: any) {
      console.log('[Push] Expo token fallback to native FCM device token:', expoErr?.message);
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = typeof deviceToken?.data === 'string' ? deviceToken.data : null;
      } catch {}
    }

    if (!token) {
      console.log('[Push] Could not obtain rider push token');
      return null;
    }

    await registerPushToken(token);
    console.log('[Push] Rider push token registered:', token);
    return token;
  } catch (err: any) {
    console.log('[Push] Registration failed:', err?.message || err);
    return null;
  }
}

/**
 * Displays a native OS push notification banner immediately on the rider's phone
 * (with sound & vibration on the 'orders' channel).
 */
export async function showLocalPushNotification(
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    if (Platform.OS === 'web') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'orders' } : {}),
      } as any,
      trigger: null,
    });
  } catch (err: any) {
    console.log('[Push] Rider local notification error:', err?.message || err);
  }
}

