---
"@medusajs/orchestration": patch
"@medusajs/core-flows": patch
---

fix(orchestration,core-flows): fewer reads per cart refresh: no checkpoint lookup for flows never stored, no promotion recalculation when none can apply, no second cart read in the shipping refresh
