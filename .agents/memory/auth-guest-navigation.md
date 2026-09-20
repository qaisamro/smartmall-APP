---
name: Auth guest navigation
description: Rules for leaving mobile authentication screens and avoiding protected-route redirect loops.
---

Authentication screens should leave through a public route using replacement navigation, not a blind back navigation that can reopen the protected page that triggered login.

**Why:** A guest redirected from cart, profile, or another protected screen can otherwise go back into the same guard and become trapped between the protected route and Login.

**How to apply:** Keep public destinations (home, sections, malls, and search) accessible from Login/Register, and use replace navigation for the close/guest actions. Preserve backend authentication routes unchanged.