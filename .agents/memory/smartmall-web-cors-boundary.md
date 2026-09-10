---
name: SmartMall web CORS boundary
description: Cross-origin behavior of the live Laravel API from Expo Web.
---

The live SmartMall API can return Laravel validation responses to direct HTTP/native clients, but its registration response does not include `Access-Control-Allow-Origin`. Expo Web therefore reports browser `TypeError: Failed to fetch` / Axios `ERR_NETWORK` even when the API processed the request.

**Why:** The mobile app’s runtime base URL was correct; a browser-origin request from the Replit Expo preview was blocked after the server response because the API CORS allowlist did not include that origin.

**How to apply:** Treat this as a backend CORS/deployment issue, not an API URL issue. Do not claim Expo Web registration is fixed through client-only changes; native Expo requests should be tested separately, and Laravel CORS must be updated before web preview registration can consume the response.