# Project management and reflection (draft)

The project used phase-specific integration branches and personal task branches. Technical work was merged through review into group branches and then into the phase integration or main branch. Phase 5 backend security work was delivered by M5 through `task/m5-p5-security`, reviewed by M6 and M9, and merged by PR #135 before the later Phase 5 main integration.

The current closeout workflow separates technical owners from reporting, testing, user-experience and presentation roles. R1 owns requirements, testing conclusions, source/traceability indexes and final report assembly. R2 owns system design, implementation, AI-method and technical-decision chapters. T2/T3 and U2 own their execution records; M10 owns independent technical acceptance. This separation prevents an author from signing their own review or turning a plan into a test result.

The main management risk is version drift: a report number can be correct for an older candidate while being wrong for a later `main` commit. R1 therefore records the full software SHA separately from the document commit, links original evidence, preserves failures and keeps unverified items visible. A second risk is overstating model or human acceptance; the report distinguishes rules, fallback behavior, independent evaluation and real user experience.

The current R1 package is a draft. Final member contributions, reviewer names, course dates, licenses, human rehearsal and submission receipt require confirmation from the actual contributors and course submitter.
