# T1 cl-functional-v1 functional fixtures

This is an explicitly synthetic, isolated test package. It creates ordinary
accounts, uploaded images, products and wanted posts through the real API. It
does not seed transactions, reviews or reports, modify production roles, or
install mocked responses in application routes. T2 builds business scenarios.

## Install and validate

Use Python 3.12 with the repository's locked backend dependencies. From the
checkout root (PowerShell):

```powershell
python -m pip install -r backend/requirements.txt
$t1 = "tests/collaboration/phase-5/data-permissions"
python "$t1/verify_data.py"
python -m unittest discover -s $t1 -p test_package.py -v
python "$t1/generate_invalid_media.py"
```

Static verification checks all nine JSON fixture families, field contracts,
quotas, references, media provenance/MIME/size/SHA256, 20 OpenAPI response mocks,
and 36 direct price/trust/risk rule examples. It reports unexecuted checks
explicitly. File-format/size rejection inputs are generated locally under
ignored `media/generated/`; the >5 MiB file is never committed. No generator
uploads files. Eight original geometric JPEG/PNG files are committed, with a
CC0 source statement in `media/LICENSE.md` and a 12-definition manifest.

`mock-responses.json` is labelled `MOCK_RESPONSE`, only for isolated UI fixture
injection; a public route's artificial 401 is not an expected guest response.
`response-contract.json` is extracted from this version's OpenAPI and checked
against its UTF-8/LF hash. To refresh after a reviewed OpenAPI change, install
`PyYAML==6.0.2` and run `python "$t1/refresh_response_contract.py"`; inspect all
mock changes and rerun verification. Do not blindly refresh to hide drift.

## Audit environment prerequisites

M10 supplies a dedicated local Docker audit API and initialized R/S admins.
The runner inspects that running container before any fixture operation:

- Explicit HTTP loopback API, dedicated published `127.0.0.1` port other than 8000/8001.
- `APP_ENV=test` or `ci`; actual `DATABASE_URL` database name contains `_audit_`.
- A dedicated Redis instance/database 14 or 15, never the daily Redis database.
- Distinct public/private audit buckets, both containing `audit` in their names.
- `S3_PUBLIC_BASE_URL` points at the audit public bucket and is reachable from the runner.
- `AUTH_REGISTRATION_DOMAINS` allows the reserved `example.invalid` test domain.
- Docker label `campusloop.audit.software-sha` records the exact 40-character
  application commit. M10 must verify that the image/mounted source is that commit.

These checks require local Docker access. Remote targets are deliberately
unsupported. The label records provenance, not an independent source attestation.
Daily `campusloop-local` database/media volumes must remain intact. Do not reuse
one active audit Redis DB between concurrent acceptance groups. If the API
returns 429, coordinate an audit-only limiter reset with M10; the runner does
not change rate limits or silently clear Redis.

Provide credentials privately in `.codex-tmp/admins-permission.json`:

```json
{
  "R": {"email": "t1-permission-run1-r@example.invalid", "password": "<private runtime value>"},
  "S": {"email": "t1-permission-run1-s@example.invalid", "password": "<private runtime value>"}
}
```

R/S must already exist, be distinct ADMIN identities, and belong to this
namespace/run prefix. The setup script cannot create/promote administrators.
Without them it still creates six ordinary accounts, 60 products and 12 wanted
posts, then reports R/S and Z-disable blockers with exit 2. Z is disabled by
the normal admin API when R is available. No credentials or token responses
belong in GitHub, screenshots or shared reports.

## Import, reconcile and repeat

Run from the same checkout root; substitute the inspected audit container/port
and private admin file supplied for your environment:

```powershell
$t1 = "tests/collaboration/phase-5/data-permissions"
$audit = @("--api", "http://127.0.0.1:18014", "--container", "campusloop-pr142-audit-api",
           "--namespace", "permission", "--run-id", "run1", "--state-dir", ".codex-tmp/t1-state")
python "$t1/setup_data.py" @audit --admins .codex-tmp/admins-permission.json
python "$t1/setup_data.py" @audit
python "$t1/verify_data.py" --live @audit
python "$t1/reset_data.py" @audit
python "$t1/reset_data.py" @audit --apply
```

The first two successful setup calls both report `accounts:8, products:60,
wanted:12, blocked:[]`; zero fixture rejections are expected in setup. The
private manifest maps fixture IDs to actual IDs and records environment,
dataset fingerprint, owner-specific upload URLs, source/stored hashes and
prepared payloads. The API normalizes accepted images to JPEG, so source and
stored hashes are recorded separately. Live verification reads back persisted
fields, ownership/status, product counts, stored image hashes and all 30
keyword queries within the namespace. This is not a semantic-ranking evaluation.

Run IDs contain up to 20 lowercase letters/digits/hyphens. Supported namespaces:
`permission`, `business`, `environment`, `experience`, `demo`. New namespaces
need separate admins; never borrow another namespace's accounts/media.

The manifest is the recovery journal: save it privately, do not delete/edit it
to retry. Registration credentials and product/wanted payloads are saved
before requests; stable API idempotency keys recover ambiguous creation
responses. Wanted `+7d` becomes a timezone-qualified timestamp once per run;
the final four posts are closed through the normal close API. Images are
uploaded by the matching owner. Ambiguous uploads stop with an explicit error
instead of creating more objects. Run a single writer per namespace/run;
concurrent writers to one manifest are unsupported.

Changed datasets/environments, transaction-modified products and partially
reset runs require a new run ID. Setup never changes T2 business states to
make a rerun pass. Exits: 0 = completed stated checks; 1 = error/mismatch;
2 = explicit blockers or partial cleanup.

## Reset boundary and remaining work

Reset defaults to dry-run and reports zero changed resources. `--apply`
checks each real resource's owner and exact namespace title before deleting
editable products or closing wanted posts. Reserved/sold products are blocked.
The API has no safe namespace account/media/history purge, so reset retains
those objects, records `reset-partial`, and exits 2 even when all supported
cleanup succeeds. Closed wanted posts remain as history; this is not an empty
database reset. A new run ID is required afterward. Only M10 may arrange
whole disposable-environment retirement, never a daily database wipe.

The 36 permission cases in `test-cases.md`/`execution-log.csv` remain unexecuted;
package import and rule checks do not replace browser authorization tests.
Invalid request fixtures contain runtime placeholders and contract/precondition
references. Static validation rejects 22 by schema; duplicate-email and expired
wanted semantics need API execution. The three unavailable-service transport
scenarios need a separate controlled service-outage check. No L3/real transaction
labels are manufactured. See `runtime-evidence.json` and `dataset-verification.md`
for the precise acceptance scope, software SHA and retained blockers.
