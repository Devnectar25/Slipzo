// Push notifications for the Android app (Firebase Cloud Messaging through @capacitor/push-notifications).
// Android shows them even when the app is closed: plan reminders, offers and announcements from Slipzen.
//
// Switched off until Firebase is set up, because registering without android/app/google-services.json
// crashes the app. To switch on: add google-services.json, build with VITE_PUSH_ENABLED=true, then `npx cap sync android`.
import { Capacitor } from "@capacitor/core"
import { call } from "./utils"

const TOKEN_KEY = "slipzo_push_token"
let listenersAdded = false

export const pushSupported = () =>
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === "android" &&
  String(import.meta.env.VITE_PUSH_ENABLED || "").toLowerCase() === "true"

const loadPlugin = async () => (await import("@capacitor/push-notifications")).PushNotifications

/**
 * Asks for permission (Android 13+ shows the system prompt once), registers this phone with Firebase
 * and saves its token for the signed-in user. Safe to call on every sign in / app start.
 */
export async function initPush() {
  if (!pushSupported()) return
  try {
    const PushNotifications = await loadPlugin()

    if (!listenersAdded) {
      listenersAdded = true
      await PushNotifications.addListener("registration", async ({ value }) => {
        if (!value) return
        try {
          await call("/push/register", { method: "POST", body: JSON.stringify({ token: value, platform: "android" }) })
          localStorage.setItem(TOKEN_KEY, value)
        } catch (err) {
          console.warn("Could not save push token:", err?.message)
        }
      })
      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("Push registration failed:", err?.error || err)
      })
      // app open: Android does not show the banner itself, so the app shows it
      await PushNotifications.addListener("pushNotificationReceived", (n) => {
        window.dispatchEvent(new CustomEvent("slipzo_push_received", {
          detail: { title: n?.title, body: n?.body, data: n?.data || {} }
        }))
      })
      // notification tapped: open the page it points to (e.g. Pricing for plan reminders and offers)
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action?.notification?.data || {}
        window.dispatchEvent(new CustomEvent("slipzo_push_open", { detail: { view: data.view || "", data } }))
      })
    }

    // high-importance channel so notifications pop up on screen (matches channelId "important" on the server)
    await PushNotifications.createChannel({
      id: "important",
      name: "Important updates",
      description: "Plan reminders, offers and announcements from Slipzen",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#0284c7"
    }).catch(() => {})

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== "granted") return
    await PushNotifications.register()
  } catch (err) {
    console.warn("Push notifications unavailable:", err?.message || err)
  }
}

/** On sign out: this phone stops getting the account's notifications. authToken: the session being signed out. */
export function stopPush(authToken) {
  if (!pushSupported()) return
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return
  localStorage.removeItem(TOKEN_KEY)
  call("/push/unregister", {
    method: "POST",
    timeout: 8000,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ token })
  }).catch(() => {})
}
