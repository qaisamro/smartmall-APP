---
name: Expo global direction
description: Platform-specific rules for applying SmartMall's app-wide Arabic/English layout direction.
---

SmartMall must synchronize `I18nManager` with the selected language on native startup and language changes, but must not run native direction synchronization on web. Web uses the document direction and root container direction styles.

**Why:** React Native Web can report a native RTL state that causes `reloadAppAsync()` during initialization; repeated reloads leave the preview blank. Native `I18nManager.forceRTL()` requires a reload for the full layout to update, and an Expo Go JS reload may not recreate the existing Android native hierarchy.

**How to apply:** Guard native synchronization with `Platform.OS !== 'web'`; apply `document.documentElement.dir`/`lang` on web, set the selected direction at the root/navigation containers before rendering screens, and use a runtime-scoped one-shot persisted reload guard to avoid loops when Expo Go does not apply native direction changes. SecureStore keys may only use alphanumeric characters plus `.`, `-`, and `_`.