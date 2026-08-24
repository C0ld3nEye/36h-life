import { soundEngine } from './audio';

// Audio & System Notification manager for PWA & Web browsers

type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotificationPermission(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn("Notification request error:", e);
    return Notification.permission;
  }
}

// Gentle synthetic audio chime using Web Audio API (with mobile unlock)
export function playNotificationChime(): void {
  soundEngine.playNotificationChime();
}

export interface GameNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  silent?: boolean;
}

export async function sendGameNotification({
  title,
  body,
  tag = 'life-sim-task',
  silent = false
}: GameNotificationOptions): Promise<boolean> {
  // 1. Play sound
  if (!silent) {
    playNotificationChime();
  }

  // 2. Vibrate phone
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([150, 75, 150]);
    } catch (_) {}
  }

  // 3. System notification
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  let sent = false;

  // Primary for Mobile & PWA: ServiceWorker Registration showNotification
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa_app_icon.png',
          badge: '/pwa_app_icon.png',
          tag: tag,
          renotify: false,
          vibrate: [200, 100, 200],
          data: { url: '/' }
        } as any);
        sent = true;
      }
    } catch (e) {
      console.warn("ServiceWorker showNotification failed, trying fallback:", e);
    }
  }

  // Fallback for Desktop standard browser window
  if (!sent) {
    try {
      new Notification(title, {
        body,
        icon: '/pwa_app_icon.png',
        tag: tag,
      });
      sent = true;
    } catch (e) {
      console.warn("Standard Notification constructor fallback failed:", e);
    }
  }

  return sent;
}
