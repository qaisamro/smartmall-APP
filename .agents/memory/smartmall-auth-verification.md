---
name: SmartMall auth verification
description: Safe environment choice for exercising mobile customer registration and session behavior.
---

For mobile auth verification, use the repository's Laravel service with an isolated SQLite database and a disposable local account. Do not create test customers against the live API when no staging account is available.

**Why:** The mobile app's configured API is production, and a successful registration persists customer data there. Local auth verification can cover the token, customer role, duplicate-email, login, `/me`, logout, and revoked-token paths without leaving production data behind.

**How to apply:** Keep the local database and generated environment file temporary, seed only the customer role needed by registration, and report any behavior that depends on production-only infrastructure separately.