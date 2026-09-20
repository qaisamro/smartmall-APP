---
name: Mobile numeric display
description: The mobile UI must keep Arabic text and RTL while rendering every displayed numeric value with Western digits.
---

Use display-only normalization for mobile numbers: Arabic and Persian digit characters in API strings should be mapped to 0-9, while formatted currency and dates must use an Arabic locale with the `latn` numbering system. Do not normalize values in API payloads or persisted storage.

**Why:** Arabic locale defaults can render `١٢٣` even when the underlying value is correct, and phone numbers or identifiers may arrive as strings that bypass `Intl`.

**How to apply:** Reuse the shared number/date/phone display helpers for new screens; do not add direct Arabic-locale `toLocale*` calls or render backend phone/identifier strings without normalization.