# SeeraAI - Google Play Store & Apple App Store Publishing Guide

Owner Account: `ayeledha@gmail.com` / `ayeledha@saiethio.com`
Package ID (Android): `com.saiethio.seeraai`
Bundle ID (iOS): `com.saiethio.seeraai.ios`

---

## 1. Google Play Store (Android TWA / AAB)
To generate the Android App Bundle (`.aab`) for Google Play Console using Bubblewrap:

1. Install Bubblewrap CLI globally:
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Build the distribution web files:
   ```bash
   npm run build:distribution
   ```
3. Initialize and build the Android package using the pre-configured `twa-manifest.json`:
   ```bash
   npx @bubblewrap/cli update
   npx @bubblewrap/cli build
   ```
4. Upload the generated `.aab` file to **Google Play Console** under your developer account (`ayeledha@gmail.com`).

---

## 2. Apple App Store (iOS / Capacitor)
To prepare the iOS app for Apple App Store Connect:

1. Install Capacitor CLI:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init
   ```
2. Build the app and sync with iOS:
   ```bash
   npm run build
   npx cap add ios
   npx cap sync ios
   ```
3. Open Xcode to build and archive:
   ```bash
   npx cap open ios
   ```
4. In Xcode, sign with your Apple Developer Account (`ayeledha@gmail.com`) and upload to **App Store Connect**.

---

## 3. Security Guarantee (`GEMINI_API_KEY`)
- **Zero Client Exposure**: The API key is securely stored in backend environment variables (`server.ts`).
- All AI inferences and legal audits are proxied through `/api/*`, ensuring no API credentials are ever exposed in mobile binaries or browser clients.
