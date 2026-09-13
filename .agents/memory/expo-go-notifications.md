---
name: Expo Go notification boundary
description: Expo Go Android limitations for the mobile app's native notification service.
---

Expo Go must not import or call remote notification APIs on Android. Detect Expo Go through `Constants.appOwnership === 'expo'` or `Constants.executionEnvironment === 'storeClient'`, keep `expo-notifications` as a type-only reference, and dynamically import it only after the runtime guard passes. Make notification configuration, token registration, response listeners, and permission calls no-ops there. Keep FCM behavior enabled for Development Builds and standalone builds.

**Why:** Expo SDK 53 and later removed Android remote notification support from Expo Go. Even a top-level runtime import can fail before a later function guard runs, emitting repeated errors and cascading into misleading route/default-export errors that prevent unrelated screens such as QR scanning from loading.

**How to apply:** When debugging an Expo Go QR launch, inspect runtime logs for the Expo Go remote-notification error first. Do not remove FCM from native builds; only guard the Expo Go path.