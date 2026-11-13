# CampusLoop development rules

- Preserve the existing approved interface when connecting APIs or fixing bugs. Do not replace page layouts with generic forms, lists or cards without the user's explicit request.
- Before changing a frontend route, compare its current live implementation with the original page under `frontend/src/pages/`. Restore presentation through the live SDK/session layer; never restore Mock stores, hardcoded identities or fallback products to production routes.
- Check the complete affected journey, including desktop/mobile layout, guest access, permissions, failure states and persistence after reload. Passing TypeScript/build alone does not verify the interface or the business flow.
- Use `scripts/start-local.ps1` for the daily website. Keep its database and media volumes. Run write-heavy acceptance tests against a dedicated audit database and Redis DB14/15, never the daily account database.
- Clearly identify the checkout/branch being previewed, the API it uses and whether changes are merged. Preserve unrelated user documents and outputs.
- Keep daily, T1 and T2 on the same application revision after bug fixes, including their API/worker images and search configuration. Preserve each environment's accounts, database and media; verify the running revision and relevant behavior in each environment before claiming the fix is available everywhere. Keep old acceptance evidence tied to its original SHA.
- Keep temporary worktrees, checks, logs, caches and local backups under this project's `.codex-tmp/`; do not create extra Desktop folders unless the user requests an exported deliverable there. Update existing README/docs for handoff instructions.
- When a tool call fails because of invalid arguments or parameters, inspect the error and tool schema, correct the arguments or switch to a suitable available tool, and do not retry the identical failing call. After repeated tool failures, stop retrying and report the blocker and current work state plainly.
- Keep progress updates useful and non-repetitive: report only new findings, decisions, or completed work; do not repeat the same sentence or restate the plan when nothing has changed. If interrupted, inspect the current state and continue without duplicating completed work.

See [the interface restoration review](docs/development/interface-restoration.md) for the incident and verification scope.
