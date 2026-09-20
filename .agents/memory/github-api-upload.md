---
name: GitHub API repository upload
description: Reliable fallback when Git transport authentication is unavailable and a GitHub repository is empty.
---

When Git transport authentication is unavailable, an empty GitHub repository must first receive a seed file through the GitHub Contents API before `git.createBlob` accepts Git database uploads. After seeding, upload blobs, build trees incrementally, and create commits through the connected GitHub client.

**Why:** GitHub returns `Git Repository is empty` for `git.createBlob` on an empty repository, even though the repository itself exists and is writable.

**How to apply:** Never request or expose a token. Use the configured GitHub integration, seed with a safe tracked file, keep tree requests below the API timeout by batching, and avoid force-updating a branch that contains unrelated user history.