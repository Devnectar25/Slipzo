// Push notifications for the Android app (Firebase Cloud Messaging through @capacitor/push-notifications).
// Android shows them even when the app is closed: plan reminders, low stock, offers and announcements from Slipzen.
import { Capacitor } from "@capacitor/core"
import { call } from "./utils"

const TOKEN_KEY = "slipzo_push_token"
const STATUS_KEY = "slipzo_push_status"
// Same id as ANDROID_CHANNEL on the server and the default channel in AndroidManifest.xml.
// A channel's sound can never be changed once it exists, so a change here needs a new id.
const CHANNEL_ID = "slipzen_alerts"
const OLD_CHANNEL_ID = "important" // asked for a sound file the app does not have, so it stayed silent
let listenersAdded = false

export const pushSupported = () =>
  Capacitor.isNativePlatform() &&
  Capacitor.getPlatform() === "android" &&
  String(import.meta.env.VITE_PUSH_ENABLED || "").toLowerCase() === "true"

// The plugin must never be returned from (or resolved by) an async function: a promise that resolves to a Capacitor plugin
// calls its .then(), which Android does not know ("PushNotifications.then() is not implemented"), and everything stops.
// So the module is awaited and the plugin is taken out of it where it is used.
const loadPushModule = () => import("@capacitor/push-notifications")

// ---------- does it work on this phone? (the notification bell shows it when it does not)
let status = (() => {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || "null") || {} } catch { return {} }
})()
const setStatus = (change) => {
  status = { ...status, ...change }
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(status)) } catch { /* storage can be unavailable */ }
  window.dispatchEvent(new CustomEvent("slipzo_push_status", { detail: status }))
}
/** "ok" | "blocked" (notifications are off for the app) | "failed" (could not register) | "" (not known yet, or not the app) */
export const pushState = () => {
  if (!pushSupported()) return ""
  if (status.permission && status.permission !== "granted") return "blocked"
  if (status.error) return "failed"
  return status.saved ? "ok" : ""
}

// ---------- telling the server about this phone
let retryTimer = null
let retries = 0
const retryLater = () => {
  if (retryTimer || retries >= 6) return
  retries += 1
  retryTimer = setTimeout(() => { retryTimer = null; syncPushToken() }, Math.min(5 * 60000, 10000 * 2 ** (retries - 1)))
}

/** Saves this phone's push token on the server, for the account that is signed in (or for nobody before sign in) */
export async function syncPushToken() {
  if (!pushSupported()) return
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return
  try {
    await call("/push/register", {
      method: "POST",
      keepSession: true, // an older server refuses this before sign in; that must not sign anybody out
      body: JSON.stringify({ token, platform: "android" })
    })
    retries = 0
    setStatus({ saved: true, error: "" })
  } catch (err) {
    console.warn("Could not save the push token:", err?.message || err)
    // not signed in on an older server: done again after sign in
    if (err?.status === 401) return
    setStatus({ saved: false, error: "server" })
    retryLater()
  }
}

async function ensureChannel(PushNotifications) {
  await PushNotifications.createChannel({
    id: CHANNEL_ID,
    name: "Slipzen alerts",
    description: "Plan reminders, low stock, offers and announcements from Slipzen",
    importance: 5, // pops up on screen
    visibility: 1, // shown on the lock screen
    // no "sound": the phone's own notification sound is used
    vibration: true,
    lights: true,
    lightColor: "#0284c7"
  }).catch(() => {})
  await PushNotifications.deleteChannel({ id: OLD_CHANNEL_ID }).catch(() => {})
}

/**
 * Starts push notifications: listeners, the channel, the permission question (Android 13+) and registration with
 * Firebase. Safe to call again (after sign in, when the app comes back). ask: false never shows the question.
 */
export async function initPush({ ask = true } = {}) {
  if (!pushSupported()) return
  try {
    const { PushNotifications } = await loadPushModule()

    if (!listenersAdded) {
      listenersAdded = true
      await PushNotifications.addListener("registration", async ({ value }) => {
        if (!value) return
        localStorage.setItem(TOKEN_KEY, value)
        setStatus({ error: "" })
        await syncPushToken()
      })

      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("Push registration failed:", err?.error || err)
        setStatus({ saved: false, error: "firebase" })
      })

      // App open: Android shows nothing by itself, so the app shows a message
      await PushNotifications.addListener("pushNotificationReceived", (n) => {
        window.dispatchEvent(new CustomEvent("slipzo_push_received", {
          detail: { title: n?.title, body: n?.body, data: n?.data || {} }
        }))
      })

      // Tapped in the phone's notification list: open the page it is about
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action?.notification?.data || {}
        window.dispatchEvent(new CustomEvent("slipzo_push_open", { detail: { view: data.view || "", data } }))
      })

      // Back in the app: notifications may have been turned on in the phone's settings, or a save that failed can work now
      const { App } = await import("@capacitor/app")
      await App.addListener("resume", () => { retries = 0; initPush({ ask: false }) })
    }

    await ensureChannel(PushNotifications)

    let perm = await PushNotifications.checkPermissions()
    if (ask && perm.receive !== "granted") perm = await PushNotifications.requestPermissions()
    setStatus({ permission: perm.receive })
    if (perm.receive !== "granted") return

    // Firebase answers with the token ("registration" above), which is then saved on the server
    await PushNotifications.register()
    await syncPushToken()
  } catch (err) {
    console.warn("Push notifications unavailable:", err?.message || err)
    setStatus({ saved: false, error: "firebase" })
  }
}

/** On sign out: this phone stops getting the account's notifications. authToken: the session being signed out. */
export function stopPush(authToken) {
  if (!pushSupported()) return
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return
  // the token itself stays the phone's own: it is saved again at the next sign in
  call("/push/unregister", {
    method: "POST",
    timeout: 8000,
    keepSession: true,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: JSON.stringify({ token })
  }).catch(() => {})
}
