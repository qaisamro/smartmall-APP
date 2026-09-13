---
name: FCM delivery routing
description: The SmartMall policy for adding Android FCM without changing existing Web Push behavior.
---

Use an additive notification channel to choose between Android FCM and the existing Web Push path. Do not modify `PushNotificationService` or the original `WebPushChannel`.

**Why:** SmartMall must support Android app notifications without sending duplicate events to users who also have a browser subscription, while preserving the website's established Web Push behavior.

**How to apply:** Treat an active Android FCM token plus configured Firebase as the exclusive target for that event. Otherwise delegate to the original Web Push channel. Keep Firebase credentials and Android config local until production approval.