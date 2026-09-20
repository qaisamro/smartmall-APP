---
name: Server-side WhatsApp verification
description: Security boundary for SmartMall phone registration and password recovery.
---

WhatsApp verification codes must be generated, hashed, expired, attempt-limited, and consumed on the Laravel API. The Expo client may carry only an opaque challenge id and a one-time proof returned after server verification; it must never generate codes or contain provider credentials.

**Why:** A locally generated code only proves that the client can repeat its own value and cannot establish phone ownership. Provider credentials also must remain server-side.

**How to apply:** Keep registration and password reset purposes separate, bind every challenge and proof to the normalized phone, and invalidate a verified proof after the protected operation succeeds.