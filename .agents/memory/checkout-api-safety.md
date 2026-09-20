---
name: SmartMall checkout API safety
description: Backend order-creation constraints and the safe endpoint used by mobile checkout.
---

The backend has an authenticated customer order endpoint for safe checkout, but the current mobile client still uses the legacy pending-order flow. The customer endpoint accepts product IDs, quantities, and supported checkout fields, then calculates prices and totals from locked database rows and reserves stock transactionally. The pending-order endpoint accepts client-supplied prices and totals and is not safe as the mobile release path.

**Why:** Source inspection on September 12, 2026 showed mobile checkout posts to `/orders/pending`, while the safe `/customer/orders` route already exists. Trusting local cart prices or totals could create incorrect orders and violate server-authoritative price and stock requirements. The website’s existing pending-order flow must remain compatible while mobile migrates separately.

**How to apply:** Before release, migrate mobile order placement to the authenticated customer order endpoint where its one-mall and integer-quantity constraints fit, or obtain an explicitly reviewed safe replacement. Send only product IDs, integer quantities, checkout fields, and an idempotency key. Keep the cart until a successful server response and handle stock conflicts without clearing it. Do not redirect mobile to another legacy pending endpoint.