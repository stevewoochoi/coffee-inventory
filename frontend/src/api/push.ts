import client from './client';
import type { ApiResponse } from './auth';

export const pushApi = {
  getVapidPublicKey: () =>
    client.get<ApiResponse<{ publicKey: string }>>('/push/vapid-public-key'),

  subscribe: (data: {
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }) => client.post<ApiResponse<{ id: number }>>('/push/subscribe', data),
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(userId: number): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    const res = await pushApi.getVapidPublicKey();
    const vapidKey = res.data.data.publicKey;
    if (!vapidKey) {
      console.warn('VAPID key not configured on server');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const json = subscription.toJSON();
    await pushApi.subscribe({
      userId,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    });

    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}
