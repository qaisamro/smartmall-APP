# SmartMall Android FCM — local setup

This setup is additive and local-only. It does not change the website Web Push
flow, `PushNotificationService`, or the Hostinger deployment.

## 1. Firebase Android file

1. In Firebase Console, use the project that owns the SmartMall Android app.
2. Register an Android app with package name `com.samrtmall.mobile`.
3. Download `google-services.json`.
4. Save the complete file contents as the `GOOGLE_SERVICES_JSON` secret in the
   secure workspace/build environment. Do not paste it into chat or commit it.
   The Android build hook writes the ignored file only when the build needs it.
5. For local-only testing, the file may instead be placed at:

   `artifacts/smartmall-mobile/google-services.json`

   The file is ignored by git. Do not paste its contents into chat or commit it.

6. Build a development Android client after the secure secret or local file is
   present. The build hook validates that the Firebase package name matches
   `android.package` before Expo reads the
   `android.googleServicesFile` entry from `app.json`.

## 2. Laravel service account

1. In the same Firebase project, create a service account with permission to
   send Firebase Cloud Messaging messages.
2. Download its JSON key.
3. Place it locally at:

   `services/smartmall-api/storage/app/firebase/service-account.json`

   This path is ignored by git and is not copied to Hostinger.
4. Set these values in the local Laravel `.env` only:

   ```dotenv
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CREDENTIALS=storage/app/firebase/service-account.json
   ```

## 3. Install and migrate locally

From `services/smartmall-api`:

```bash
composer install
php artisan migrate
```

The migration creates `fcm_tokens` with `app_version`. Do not run these
commands against Hostinger from this workflow.

## 4. Android behavior

- After an authenticated Android session starts, the app requests notification
  permission and registers the current FCM token with `POST /api/v1/push/fcm-token`.
- On logout, the app removes that token with
  `DELETE /api/v1/push/fcm-token` before revoking the Sanctum session.
- Token refresh is handled by the native push-token listener and by registering
  the current device token whenever the authenticated root is configured.
- Web and iOS do not register an Android FCM token.

## 5. Conditional delivery policy

The existing Laravel notifications now use an additive
`MobileAwarePushChannel`. It attempts FCM only when Firebase is configured and
the user has an active Android token. If that target exists, Web Push is skipped
for that notification. Otherwise, the unchanged `WebPushChannel` delegates to
the unchanged `PushNotificationService` for the normal web notification.

This is option B: one notification event is delivered through the available
platform target instead of being duplicated between Web Push and Android FCM.