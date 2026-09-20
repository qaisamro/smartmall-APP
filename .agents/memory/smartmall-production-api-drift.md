---
name: SmartMall production API drift
description: The deployed Hostinger API may not contain routes present in the repository Laravel source.
---

The live SmartMall API can be behind the Laravel route tree in the repository. A route that exists in `services/smartmall-api/routes/api.php` may still return a production 404 until the serving Hostinger deployment is updated.

**Why:** The mobile customer-order endpoint was correct in source, while the live API returned `route api/v1/customer/orders could not be found`, so changing the mobile client to a legacy endpoint would have weakened the safe checkout contract.

**How to apply:** Before changing a mobile endpoint, perform a non-mutating request against the live API and verify its response shape. For barcode lookup, the live `POST /scan` contract is a mall-scoped `{type:"product", product}` response; treat route or shape drift as a backend deployment issue, not a reason to redirect mobile traffic to an unsafe or legacy route.

The current Hostinger deployment is the production source of truth for the existing website. Do not deploy, migrate, clear caches, or alter its Laravel routes while adapting the mobile app; consume the live API contract as it exists.

**Why:** The user explicitly wants the existing `samrtmall.cloud` website and backend to remain unchanged because they are operating normally.

**How to apply:** Keep mobile changes client-side and compatible with the currently reachable production endpoints. Treat new local Laravel routes or middleware as non-production until the user explicitly authorizes a backend deployment.