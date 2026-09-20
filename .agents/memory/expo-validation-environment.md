---
name: Expo validation environment
description: Non-blocking Expo SDK and Metro validation issues observed in this Replit mobile workspace.
---

Expo Doctor may report SDK 57 patch-version drift across Expo packages even when TypeScript, route export, Metro startup, and Android/iOS production bundles succeed. Metro may also report that React Native DevTools cannot load because `libglib-2.0.so.0` is unavailable. New SDK 57 Expo packages can also be temporarily blocked by the workspace's one-day package release-age guard. Expo Notifications can emit a Web push-token listener warning from its own auto-registration module even when application code guards listeners to Android.

**Why:** These are workspace/toolchain conditions rather than application failures, and changing dependencies to silence them can expand scope or destabilize the app. Trusted Expo development-build packages may be published inside the guard window.

**How to apply:** Report the drift, GLib warning, and Expo Notifications Web listener warning as validation limitations unless a production bundle or app startup actually fails. If a development build dependency is required, use the official SDK-matched version and remove any temporary release-age exemptions immediately after installation.