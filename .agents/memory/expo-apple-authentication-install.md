---
name: Expo Apple Authentication install
description: Expo 57 package version and monorepo installation constraint for native Apple sign-in.
---

For Expo SDK 57 in this workspace, use the published `expo-apple-authentication` 57.0.2 package. Add it to the mobile workspace dependency set and restart Metro after changing dependencies; a root-level install is rejected by the pnpm workspace guard.

**Why:** The package registry did not provide the guessed 57.0.3 patch, and Metro continues using the old dependency graph until the mobile workflow is restarted.

**How to apply:** Check the exact published patch before installing Expo native modules, target `@workspace/smartmall-mobile`, add the config plugin, and restart the mobile workflow once.