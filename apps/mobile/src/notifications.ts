/**
 * Push setup. The API stores the Expo push token on the Device model and sends
 * CLASS_REMINDER (24h, 1h, 10 min) and CLASS_STARTED when the teacher taps Start.
 * Tapping CLASS_STARTED opens the class room for that session.
 */
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerForPush(apiBase: string, userId: string): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await fetch(`${apiBase}/me/devices`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ pushToken: token }),
  }).catch(() => undefined);
}

export function listenForClassStart(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const sessionId = res.notification.request.content.data?.sessionId;
    if (typeof sessionId === "string") router.push(`/class/${sessionId}`);
  });
  return () => sub.remove();
}
