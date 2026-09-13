---
name: Native POS scope
description: Current SmartMall mobile POS boundary and the backend limitation that defines it.
---

The native mobile POS keeps owner and cashier contracts separate from customer cart and checkout flows. Cashier sessions, items, and sales must be scoped to the authenticated cashier and assigned mall; never reuse owner authorization.

**Why:** Direct cashier sales need the same stock and accounting behavior as owner POS without allowing a cashier to read or mutate another cashier’s session or an owner session.

**How to apply:** Add cashier-only routes and select them in the mobile client only for the cashier role. Bind every session/item operation by both user and mall, while leaving owner routes and customer checkout unchanged.