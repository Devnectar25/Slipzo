import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n.js'
import App from './App.jsx'
import { isNativeApp } from './lib/utils.js'
import { installPopupScrollLock } from './lib/scrollLock.js'
import { installErrorMonitor } from './lib/errorMonitor.js'

// errors on this device go to the admin panel's Error Monitor (grouped there with a count)
installErrorMonitor()

// The page behind a popup must not scroll while the popup is open
installPopupScrollLock()

// Register Service Worker in production for PWA (WebAPK) installability
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Not in the Android app: its files are already on the phone, and a service worker could keep serving the files of an
  // older version after an update
  if (import.meta.env.PROD && !isNativeApp) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('📱 Slipzen PWA Service Worker active:', reg.scope))
        .catch((err) => console.warn('PWA registration info:', err));
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)