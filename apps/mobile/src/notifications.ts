/**
 * Notification taps. When the server starts sending pushes (CLASS_STARTED with
 * data.path = "/class/<id>"), tapping one opens that page inside the app.
 * Registering the device token comes with the push step.
 */
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export function onNotificationOpen(open: (path: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res.notification.request.content.data ?? {};
    const path = typeof data.path === "string" ? data.path : typeof data.sessionId === "string" ? `/class/${data.sessionId}` : null;
    if (path?.startsWith("/")) open(path);
  });
  return () => sub.remove();
}
