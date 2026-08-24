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

// Gentle synthetic audio chime using Web Audio API (zero external assets needed)
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // First tone (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Second tone (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.debug("Audio chime skipped:", err);
  }
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
