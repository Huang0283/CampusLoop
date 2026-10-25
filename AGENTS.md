# CampusLoop development rules

- Preserve the existing approved interface when connecting APIs or fixing bugs. Do not replace page layouts with generic forms, lists or cards without the user's explicit request.
- Before changing a frontend route, compare its current live implementation with the original page under `frontend/src/pages/`. Restore presentation through the live SDK/session layer; never restore Mock stores, hardcoded identities or fallback products to production routes.
- Check the complete affected journey, including desktop/mobile layout, guest access, permissions, failure states and persistence after reload. Passing TypeScript/build alone does not verify the interface or the business flow.
- Use `scripts/start-local.ps1` for the daily website. Keep its database and media volumes. Run write-heavy acceptance tests against a dedicated audit database and Redis DB14/15, never the daily account database.
- Clearly identify the checkout/branch being previewed, the API it uses and whether changes are merged. Preserve unrelated user documents and outputs.

See [the interface restoration review](docs/development/interface-restoration.md) for the incident and verification scope.
