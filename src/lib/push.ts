/**
 * Push notification setup for SDK 54.
 *
 * Flow:
 *  1. `setupNotificationHandler()` — once at app boot. Configures how
 *     foreground notifications are presented.
 *  2. `registerForPushNotifications(userId)` — called once the user is
 *     authenticated. Requests permission, fetches the Expo push token,
 *     and upserts a row into `push_tokens` so the backend can send to it.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

let handlerSet = false;

/**
 * Configure how notifications are presented when the app is in foreground.
 * Idempotent. Safe to call at app boot.
 */
export function setupNotificationHandler() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
    }),
  });
}

/**
 * Ask for permission, get the Expo push token, save it to `push_tokens`.
 * Returns the token on success, null on any failure or simulator.
 *
 * Safe to call multiple times — upserts by token uniqueness.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Simulator / web can't get push tokens.
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;

  // Permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let granted = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status;
  }
  if (granted !== 'granted') {
    return null;
  }

  // Android channel
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#002DE8',
      });
    } catch {
      // ignore
    }
  }

  // Fetch the Expo push token (uses project id from app.json/easConfig if present)
  let token: string | null = null;
  try {
    // For SDK 54 / EAS workflow, projectId is read from expo-constants.
    const projectId =
      (Constants?.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
      ?? (Constants as unknown as { easConfig?: { projectId?: string } })?.easConfig?.projectId;

    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = res.data;
  } catch (e) {
    if (__DEV__) console.warn('[push] getExpoPushTokenAsync failed:', e);
    return null;
  }

  if (!token) return null;

  // Upsert into push_tokens (RLS allows owner only).
  try {
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id:     userId,
          token,
          platform,
          device_name: Device.deviceName ?? null,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
    if (error && __DEV__) {
      console.warn('[push] upsert token failed:', error.message);
    }
  } catch (e) {
    if (__DEV__) console.warn('[push] upsert exception:', e);
  }

  return token;
}

/**
 * Remove this device's push token from the backend on sign-out.
 */
export async function unregisterPushToken(token: string | null) {
  if (!token) return;
  try {
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // ignore
  }
}
