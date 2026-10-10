# Account change of EAS

These steps create a separate EAS project under another Expo account and build an installable Android APK. The mobile app is currently linked to the Expo owner `reachkarun`.

## 1. Switch Expo accounts

Open PowerShell:

```powershell
cd C:\Users\KarunVattikuti\Downloads\LeafAI\mobile
Remove-Item Env:EXPO_TOKEN -ErrorAction SilentlyContinue
npx eas-cli@latest logout
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Log in with the new account. Confirm that `whoami` displays the new username. Removing `EXPO_TOKEN` clears any token override for this PowerShell session.

## 2. Update the project account configuration

Back up `mobile/app.json` before editing:

```powershell
Copy-Item app.json app.json.before-account-change.bak
```

In `mobile/app.json`:

- Change `expo.owner` from `reachkarun` to the new Expo username.
- Remove the existing `expo.extra.eas` block:

```json
"eas": {
  "projectId": "ba67d2e2-a2c4-4411-b873-8ad695511eaf"
}
```

Keep `expo.extra.router`. After removing the EAS block, the extra configuration should look like this:

```json
"extra": {
  "router": {}
}
```

Ensure the JSON has no trailing commas. Keep `android.package` as `com.leafcareai.app` if the APK must update the existing app.

## 3. Create and link the new EAS project

From the `mobile` directory:

```powershell
npx eas-cli@latest init
```

Accept creating a project under the new account. EAS will write the new project ID into `app.json`.

## 4. Set the backend URL

Create the public API URL variable in the new project's preview environment:

```powershell
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value "https://YOUR-BACKEND-DOMAIN" --visibility plaintext
```

Replace the placeholder with your reachable HTTPS backend origin, without `/api`. Variables from the old project do not automatically carry over. Never put backend secrets or API keys in `EXPO_PUBLIC_*` variables.

## 5. Build and download the APK

```powershell
npm ci
npx eas-cli@latest build --platform android --profile preview
```

The existing `mobile/eas.json` preview profile already uses internal distribution and `android.buildType: "apk"`. Follow the signing credential prompts. When the build finishes, open the provided build link and download the APK.

## Signing an update to the existing app

An APK installed over the previous APK must use the same Android package name and signing keystore.

If you need this compatibility, download/export the original keystore **before switching accounts**, while signed into the original account:

```powershell
npx eas-cli@latest credentials --platform android
```

Use the interactive credential menu to download the existing Android keystore and its credentials. Store them securely. After linking the new project, run the same command under the new account and upload/select the original keystore for the new project.

For a fresh test installation, EAS can generate a new keystore. If its signing key differs from the installed app, uninstall the previous app before installing the new APK. Uninstalling removes the app's local data.

## Alternative: transfer the existing project

If you want to retain the existing EAS project and its history, use the project transfer option in the Expo dashboard instead of creating a separate project. Follow the dashboard's transfer requirements, retain the existing project ID, and update the local owner to the destination account after the transfer.

## References

- [EAS CLI reference](https://docs.expo.dev/eas/cli/)
- [EAS build setup](https://docs.expo.dev/build/setup/)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [Build Android APKs](https://docs.expo.dev/build-reference/apk/)
- [App signing credentials](https://docs.expo.dev/app-signing/app-credentials/)
- [Expo account types and project transfers](https://docs.expo.dev/accounts/account-types/)
