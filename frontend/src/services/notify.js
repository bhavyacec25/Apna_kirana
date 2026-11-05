// services/notify.js
// Lightweight wrapper around the browser Notification API. If the tab
// is in the foreground we rely on the in-app toast instead (a desktop
// notification for something you're already looking at is annoying) —
// this only fires a real OS notification when the tab is backgrounded.

export function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function notify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // toast already covers this case
  try {
    new Notification(title, { body, icon: "/vite.svg" });
  } catch {
    // some browsers throw if not in a secure context — safe to ignore
  }
}
