# LeafCare AI for Android and iOS

React Native + Expo mobile companion to the existing React website. Uses the same NestJS API, accounts, database, consent requirement, and saved analyses. Colors, card styling, hero gradient, and English/Telugu/Hindi labels match the website. Includes camera/gallery selection, JPEG normalization, analysis, history details, and spoken results.

## 1. Start the existing backend

Use Node.js 22.19 or later and Docker Desktop (or your own MySQL).
From the repository root, if the backend is not already configured:

```powershell
Copy-Item .env.example .env
npm install
npm run install:all
```

Edit the root `.env`: set `OPENAI_API_KEY`, two separate random JWT secrets, and a 64-character hexadecimal `UPLOAD_ENCRYPTION_KEY`. Keep the DB settings in sync with `docker-compose.yml` (or your own MySQL credentials). Do not overwrite an existing configured `.env`.

Generate each secret separately with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then start the database and API:

```powershell
docker compose up mysql -d
npm --prefix server run dev
```

The schema is imported automatically on first initialization of the Docker database volume. An existing MySQL installation needs `database/schema.sql` imported separately. Verify `http://localhost:8080/api/health` in a browser. Keep the API terminal running. Alternatively, use the existing deployed HTTPS backend and skip local backend setup.

## 2. Configure and run mobile

In another terminal, from the repository root:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
ipconfig
```

Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL` to the backend origin, without `/api`:

| Target | Example API URL |
| --- | --- |
| Android or iPhone on the same Wi-Fi | `http://192.168.1.100:8080` (replace with your PC's IPv4 address) |
| Android Studio emulator | `http://10.0.2.2:8080` |
| iOS Simulator on the backend's Mac | `http://localhost:8080` |
| Deployed backend / standalone builds | `https://your-api-domain.example` |

`localhost` on a phone means the phone, not your PC. Allow Node.js through Windows Firewall on your private network. Open the backend's `/api/health` URL from the phone first to verify connectivity. Use HTTPS if the device blocks local HTTP.

```powershell
npm start
```

Install Expo Go compatible with this project's Expo SDK (see `package.json`) on your Android phone or iPhone. Scan the terminal QR code: use Expo Go on Android or the Camera app on iPhone. Keep both devices on the same Wi-Fi. After changing `.env`, restart with `npx expo start --clear`.

For an Android emulator, install Android Studio, create and start a virtual device, then run `npm run android`. On macOS with Xcode and an iOS simulator, run `npm run ios`. Windows can run the app on a physical iPhone through Expo Go; the iOS simulator requires macOS.

Sign in with your existing account, or create one. Photograph or select a leaf, enable consent, and analyze. Choose English, Telugu, or Hindi and tap **Read result aloud**. Tap an entry in history to reopen its result. Device voices determine language availability; iOS silent mode can mute speech.

## Expo tunnel repeatedly asks to install ngrok

If `expo start --tunnel` reports `Install @expo/ngrok@^4.1.0 and try again` after a successful global installation, use the project-local development dependency. From `mobile`, run:

```powershell
npm ci
npx expo start --tunnel --clear
```

This project includes `@expo/ngrok` in `devDependencies` so Expo can resolve it locally. To add it to another checkout that does not yet include it, use `npx expo install @expo/ngrok@^4.1.0 --dev`. Stop the old Expo process with Ctrl+C before restarting and scan the new QR code. The empty bundler cache message is expected after `--clear`; a deprecated transitive `uuid` warning is not this installation failure.

The Expo tunnel serves the mobile development bundle. Keep `EXPO_PUBLIC_API_URL` pointed at a backend reachable from your phone; tunneling Expo does not tunnel the NestJS API.

## 3. Build installable apps

From `mobile`, use Expo's EAS cloud build service (works from Windows):

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Before building, change `android.package` and `ios.bundleIdentifier` in `app.json` to identifiers you own. Configure `EXPO_PUBLIC_API_URL` in the EAS preview and production environments to your reachable HTTPS backend. This is a public configuration value; never put API keys or backend secrets in `EXPO_PUBLIC_*` variables. Local `.env` is ignored by Git and must not be relied upon for cloud builds.

```powershell
# Installable Android APK for testing
npx eas-cli@latest build --platform android --profile preview

# Android App Bundle for Google Play
npx eas-cli@latest build --platform android --profile production

# iOS build for App Store / TestFlight
npx eas-cli@latest build --platform ios --profile production
```

EAS prompts for project setup and signing credentials. iOS distribution requires an Apple Developer account; Google Play publishing requires a Play Console account. Building does not publish the app. The generated launcher icons are Expo placeholders: replace assets before distribution.

For local native compilation, use `npx expo run:android` with Android Studio/JDK installed, or `npx expo run:ios` on a Mac with Xcode. Native folders are generated from the Expo configuration.

## Validation and current differences

```powershell
npm run typecheck
npm test
npx expo-doctor@latest
npx expo export --platform all
```

The native app holds access tokens only in memory and asks for sign-in again after expiration or restart. It does not depend on the website's browser refresh cookies. The website's Web Speech recognition commands are not ported: mobile has touch controls and native text-to-speech. Camera and speech behavior must be verified on physical Android and iOS devices; real analysis also requires the running database and configured backend API key.

References: [Expo device setup](https://docs.expo.dev/get-started/set-up-your-environment/), [EAS builds](https://docs.expo.dev/build/setup/), [local native builds](https://docs.expo.dev/guides/local-app-overview/).
