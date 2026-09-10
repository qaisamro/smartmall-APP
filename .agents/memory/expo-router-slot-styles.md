---
name: Expo Router Slot styles
description: Expo Router's React Native Slot development check for array styles on direct asChild children.
---

Expo Router's native Slot shim rejects an array-valued `style` on its direct child. When using `Link asChild`, flatten only the direct child style with `StyleSheet.flatten`; ordinary nested React Native component styles may remain arrays.

**Why:** The router's Slot merge behavior inspects the immediate child during development and throws before navigation, even though React Native normally accepts style arrays.

**How to apply:** For a `Link asChild` or custom Slot wrapper, use `StyleSheet.flatten` at the immediate child boundary. Do not flatten unrelated styles throughout the app or change router dependencies.