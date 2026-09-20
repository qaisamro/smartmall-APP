---
name: SmartMall mobile API environments
description: API base URL requirements for SmartMall Expo and EAS builds.
---

All SmartMall mobile EAS profiles must use the live Laravel API base URL `https://samrtmall.cloud/api/v1`. A placeholder or non-routable profile URL causes Axios to expose a generic network error before Laravel can return its validation response.

**Why:** Development and staging profiles had a `.invalid` API hostname while the local Expo workflow used the live endpoint, making registration appear selectively broken by build profile.

**How to apply:** When changing Expo/EAS environments, verify development, staging, production, and local fallback URLs resolve to the intended API. Keep endpoint-specific HTTP status handling separate from genuine transport/TLS failures.