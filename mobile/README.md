# Virtuosa Mobile App

Native Android & iOS wrapper for [Virtuosa](https://virtuosazm.com) built with **Capacitor 6**.

## Architecture

This uses **Server URL mode** — the app loads `https://virtuosazm.com` directly inside a native WebView. This means:
- ✅ Web updates on Vercel instantly appear in the app — no store republish needed
- ✅ Backend API calls to `api.virtuosazm.com` (Render) work automatically
- ✅ Zero changes to the existing web codebase

## Directory Structure

```
mobile/
├── capacitor.config.json     ← Main config (server URL, plugins, app ID)
├── package.json              ← Capacitor CLI + plugin dependencies
├── www/
│   └── index.html            ← Branded offline fallback page
├── android/                  ← Generated Android Studio project
│   ├── app/src/main/
│   │   └── AndroidManifest.xml  ← App permissions
│   └── variables.gradle      ← SDK version config (targetSdk 35)
└── web-overrides/
    └── mobile-capacitor.js   ← CSS/JS fixes to add to the web app
```

## GitHub Actions (Automated Builds)

Two workflows are set up in `.github/workflows/`:

| Workflow | Trigger | Output |
|---|---|---|
| `build-android.yml` | Push to `app-work` | Android APK (downloadable artifact) |
| `build-ios.yml` | Push to `app-work` | iOS Simulator build |

Download built APKs from: **GitHub → Actions → [latest run] → Artifacts**

## Local Development

### Prerequisites
- Node.js 20+
- Android Studio (for Android — [download free](https://developer.android.com/studio))
- Xcode on macOS (for iOS)

### Commands

```bash
cd mobile

# Install dependencies
npm install

# Sync web assets to native projects
npm run sync

# Open in Android Studio
npm run open:android

# Open in Xcode (macOS only)
npm run open:ios
```

## App Store Submission

### Google Play Store
1. Get a [Google Play Developer account](https://play.google.com/console) ($25 one-time)
2. Generate a signing keystore: `keytool -genkey -v -keystore virtuosa.keystore ...`
3. Add keystore secrets to GitHub → Settings → Secrets → Actions:
   - `ANDROID_KEYSTORE_BASE64`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
   - `ANDROID_STORE_PASSWORD`
4. Trigger a Release build via GitHub Actions → `Build Android APK` → Run workflow → select `release`
5. Upload the release APK to Play Console

### Apple App Store
1. Get an [Apple Developer account](https://developer.apple.com) ($99/year)
2. Build via GitHub Actions `build-ios.yml` on `macos-latest` runner
3. Requires code signing certificate + provisioning profile added to secrets

## Native Features Enabled

| Feature | Plugin | Status |
|---|---|---|
| Push Notifications | `@capacitor/push-notifications` | ✅ Configured |
| Camera / Photo Upload | `@capacitor/camera` | ✅ Configured |
| Haptic Feedback | `@capacitor/haptics` | ✅ Configured |
| Status Bar Styling | `@capacitor/status-bar` | ✅ Configured |
| Splash Screen | `@capacitor/splash-screen` | ✅ Configured |
| Network Detection | `@capacitor/network` | ✅ Configured |
| Hardware Back Button | `@capacitor/app` | ✅ Configured |

## iOS App Store Tips

To pass **Guideline 4.2 (Minimum Functionality)** review:
- The `web-overrides/mobile-capacitor.js` script disables pinch-to-zoom, text selection, and rubber-band bounce
- Native camera, haptics, and push notifications differentiate the app from a "web shortcut"
- Safe area insets handle the notch, Dynamic Island, and home indicator
