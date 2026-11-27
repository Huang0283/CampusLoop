# Testing and evaluation (draft)

This chapter is intentionally a draft. Results are divided into four evidence classes:

1. **Automated technical tests:** backend, browser, SDK/build, lint and targeted regression commands recorded in repository evidence.
2. **Independent AI evaluation:** M7/M8 evaluation records, authorization and NO_GO/GO decisions. A unit test or fallback check is not an accuracy result.
3. **Human user experience:** U1/U2 task records, screenshots and manual observations. Automation cannot substitute for these records.
4. **Release acceptance:** M10's clean installation, recovery, non-functional checks and final-source review.

The M5 security evidence records 177 backend tests and 38 focused security tests on its historical isolated candidate. It covers credential and token behavior, disabled accounts, role/object authorization, rate limits, sensitive logging, report/evidence access and audit consistency. These reports are useful technical inputs, but the final report must rebind the claims to the SHA supplied by M10 and state any intervening admin-console or governance changes.

The current draft does not assert final counts for T2/T3, U2 or M10. Their handoff must state the exact software SHA, environment/data version, command or task, passed/failed/blocked/not-executed/not-applicable counts, evidence path and known limitation. Counts must be recalculated from the original execution records; the planned total is not a passed total.

Known boundaries include the distinction between technical-candidate evidence and final release approval, learning-model NO_GO or pending authorization where applicable, database-only recovery evidence where object-storage recovery is not covered, and the absence of a final course rehearsal/video/sign-off record in the current package.
