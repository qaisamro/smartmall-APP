---
name: Expo SecureStore web preview
description: Compatibility rule for secure token abstractions shared by native Expo and React Native Web.
---

Use Expo SecureStore for iOS and Android credentials, but use session-only in-memory storage on React Native Web. Never fall back to AsyncStorage or browser persistence for auth tokens.

**Why:** In this Replit Expo 57 environment, the web implementation can expose `getItemAsync` while its underlying `getValueWithKeyAsync` native method is unavailable, causing a startup crash.

**How to apply:** Keep the platform branch inside the storage abstraction. Native callers receive durable secure storage; web previews receive non-persistent memory behavior without changing auth consumers.