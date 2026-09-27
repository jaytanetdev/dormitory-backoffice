# Workflow verification — 27 September 2026

Tests use synthetic per-test data. They never connect to the configured production database or send real LINE messages.

## Boundaries

Browser tests render the actual Next application and use its actual API client. Playwright intercepts HTTP API requests with mutable fixtures. The Mini App replaces only the external LIFF SDK on an explicitly enabled development E2E server; production builds use the real SDK. API HTTP tests start the actual Nest app with JWT, permission/branch guards, validation and response envelopes, but replace Prisma. Service tests mock external calls.

This verifies the scenarios listed below, not every possible combination or 100% of source code.

## Staging cases not performed against live services

| ID | Steps | Required result | This run |
| --- | --- | --- | --- |
| LIVE-01 | Open room and branch claim links inside LINE on Android/iOS; log in and claim | Correct LIFF channel/branch; cannot reuse room invite | SDK simulated |
| LIVE-02 | Issue invoice, upload to Cloudinary, approve, refresh resident app | Database, storage, receipt, balance and LINE message agree | Boundaries tested separately; no real DB/storage |
| LIVE-03 | Deliver signed webhook and reply from backoffice | Correct inbound/outbound persisted conversation | Signature/dispatch unit-tested; no real delivery |
| LIVE-04 | Concurrent room claims, slip submissions/reviews, refresh rotations on separate DB connections | No duplicate tenancy/payment/receipt or stale balance; one token winner | Service conditions tested; PostgreSQL concurrency unverified |
| LIVE-05 | Compare OA quota/reset with provider dashboard | Quota matches actual OA month | Values mocked; month calculation tested |
| LIVE-06 | Print receipt and select camera/file in LINE on physical devices | Readable print, image permission and upload navigation | Chromium mobile emulation only |

Artifacts: test-results/results.json, playwright-report/index.html, failure screenshot/trace ZIP. Generated artifacts are ignored by Git. Measured results are in QA-RESULTS.md.

## Run from this repository

    pnpm install
    pnpm exec playwright install chromium
    pnpm test
    pnpm test:e2e
    pnpm build
    pnpm typecheck

E2E owns port 3151 and .next-e2e. The runner starts Next with windowsHide, captures output in test-results/server.log, stops its own server and restores generated Next configuration. Do not run another server on this port.

## Backoffice cases

| ID | Starting state / action | Required result |
| --- | --- | --- |
| B01–B04 | Missing session, bad password, internal/external login destination | Login gate/error; safe original route restored; external redirect refused |
| B05–B07 | All 11 menu routes; mobile navigation; empty search | No JS error/overflow, correct route, mobile menu closes, useful empty state |
| B08–B10 | Create/edit staff with role and branch; own account/read-only actor | Payload/list match; protected account cannot edit; read-only cannot mutate |
| B11–B14 | Slip preview, approve, reject blank/valid reason, approve API failure | Escape closes preview; receipt and cleared queue; reason required; failed action retains row |
| B15–B18 | Reports, vacant-room invite, move-out, PromptPay | Actual amount/status, room-specific invitation, ended contract, branch setting updated |
| B19–B22 | Quota and reset; owner/platform menus; API list error | Remaining/reset visible, role editor platform-only in navigation, genuine error |
| B23–B26 | Remove write permission; create/issue draft; add room; theme reload | Disabled write action; correct invoice/items, room created, theme persists |
| B27–B30 | Hover/tap chart, CSV download, linked/unlinked chat | Tooltip billed 25,000/received 7,000, CSV rows verified, recipient/payload correct, unlinked send blocked |
| B31–B35 | Edit branch without secrets, failed delete, create store/owner, read-only/report roles | Secrets omitted, card retained, onboarding payload, writes disabled, no forbidden settings/contracts fetch |
| B36–B38 | Create role/permissions, branch/OA, suspend staff | Permissions, independent channels, suspended status persisted in fixture |

Detailed steps/assertions: e2e/workflows.spec.ts. Every case runs in desktop Chromium and Pixel 7 emulation; B06 is intentionally skipped on desktop because it tests the mobile menu.

Unit tests: lib/*.test.mjs through tsx. They cover concurrent 401 single refresh, session clearing, failures, approved-payment sums, billing dates, collection grouping and Bangkok quota month rollover.

## Role coverage

Owner/branch manager/finance/report viewer are permission based; delegation and branch scope are also tested at API layer. Owner cannot access platform administration. Platform admin creates stores/first owners and roles. Report viewer cannot create bills, approve, move out or edit settings. Resident uses a separate JWT and own-contract scope tested in API and Mini App.

## Follow-up B39 — modal dismiss contrast

Open invoice dialog in light and dark themes on desktop/mobile; inspect dismiss text contrast and click. Required result: contrast >= 4.5:1 and the dialog closes. Source: e2e/workflows.spec.ts.
