# Product Readiness and Pilot Runbook

The application implements private workspaces, verified excerpts, configurable rubrics, background jobs, privacy enforcement, coaching follow-through, and invoice-request intake. A working local preview is not a substitute for production configuration, live-provider validation, or a real pilot.

## Deployment Order

1. Back up the target database and inspect its migration state. Keep maintenance mode on while migrating an existing deployment.
2. Apply Alembic migrations using the backend image or the private-network migration handler.
3. Deploy the API with HTTPS, database connectivity, least-privilege AWS permissions, provider settings, and the production session configuration below.
4. Start a persistent worker (`python -m app.worker`) or schedule a separate Lambda using `app.worker.handler`. For Lambda, use a 360-second timeout, a one-minute schedule, and reserved concurrency 1 for an initial pilot. Set up an execution-failure alert. Verify jobs complete without a browser polling.
5. Configure Pages Functions and build/export the frontend. Deploy the same-origin proxy and static assets together.
6. Run the launch checks below before inviting real customers.

No AWS or Pages resources are created by these instructions automatically. Enable paid infrastructure/provider usage only with an approved budget.

### Backend Configuration

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE
MOCK_AI=false
ZAI_API_KEY=SERVER_SIDE_SECRET
ZAI_MODEL=glm-5.1
FRONTEND_URL=https://revenue-coach-ai.pages.dev
CORS_ORIGINS=["https://revenue-coach-ai.pages.dev"]
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
AUTO_CREATE_SCHEMA=false
PROXY_SECRET=MATCHING_SERVER_SIDE_SECRET
AUTH_EMAIL_FROM=SES_VERIFIED_SENDER
AWS_REGION=us-east-1
AWS_S3_BUCKET=PRIVATE_BUCKET
```

Use managed secret storage or runtime IAM, not committed credentials. SES recovery requires a verified sender and permission to send to the intended recipients; sandbox restrictions must be addressed by the operator. Set `SUPPORT_EMAIL` to a monitored address. Optional `PILOT_PRICE_USD` displays a fixed pilot price; leave it unset for a scope-first quote. The contact form does not charge anyone.

### Cloudflare Pages

- Project name remains `revenue-coach-ai`; do not create a replacement project just to change this release.
- Root: `frontend`. Build: `npm run build`. Output: `out`.
- Build variable: `NEXT_PUBLIC_API_URL=/api`. Remove an older direct AWS API value.
- Function runtime variable: `API_ORIGIN` = the backend HTTPS origin (including a stage prefix if needed).
- Function secret: `PROXY_SECRET`, identical to the backend secret. Generate a new random value and store it privately.
- Deploy `functions/api/[[path]].ts` with the project. `public/_routes.json` limits Function invocation to API routes.
- Session cookies remain on the Pages origin; the browser does not need a cross-site cookie. The proxy forwards only expected headers and never follows upstream redirects.
- The proxy uses a trusted client-IP header only with the matching secret so public-form quotas do not collapse all visitors into one proxy IP.

For a VPC-attached AWS runtime, ensure the model endpoint has an approved internet-egress path, and configure service access for S3, Transcribe, and SES. Database reachability alone is not enough for real processing.

Routing and environment bindings follow the [Pages Functions routing documentation](https://developers.cloudflare.com/pages/functions/routing/) and [binding configuration](https://developers.cloudflare.com/pages/functions/bindings/). A static-assets-only upload omitting the Function will not provide working authentication.

### Legacy Database Adoption

A prior deployment used manual column additions and may have no `alembic_version` table. The new migration handler deliberately does not guess or reset such a database.

After a backup, compare its tables, columns, foreign keys, and nullability with migrations `0001` through `0003`. Only when that schema is confirmed equivalent:

```bash
alembic stamp 0003_add_evidence_account_trust
alembic upgrade head
```

If it differs, reconcile it deliberately before stamping. Imported legacy seats default to inactive; verify ownership before activating or reassigning them. Existing scorecards become `source_mode=legacy`, are visibly unverified, and are excluded from real metrics and new coaching assignments. No historical anonymous data is automatically claimed by a new signup. Create new private workspaces for pilots. Review retention settings before starting the worker: formerly passive retention flags are now enforced.

## Launch Checks

- Anonymous requests cannot read calls, reps, account data, or assignments.
- A second workspace cannot read/delete a first workspace's call, even with a known ID.
- A rep sees only their own records; a suspended seat loses existing sessions.
- Invitations/recovery links expire and cannot be reused. Confirm recovery delivery with a test account.
- An intake without required consent is rejected. Uploaded object keys cannot be substituted across calls.
- With real scoring disabled, a saved transcript produces an explicit error, not a scorecard.
- With an approved provider budget, verify one real transcript: excerpt quotes, role/timestamp provenance, rubric total, null categories, and persisted snapshot.
- In an approved AWS test bucket, verify one audio upload, transcription timing/speaker labels, cleanup under redaction, and cleanup failure/retry.
- Stop or interrupt a test worker and confirm the job is reclaimed or fails visibly after bounded attempts.
- Set short retention on disposable records; verify database and current S3/Transcribe artifacts disappear.
- Complete assignment → submission → manager feedback → compatible next-call comparison.
- Verify static `/calls/view?id=...` links survive reloads and direct navigation.
- Monitor worker failures, stuck calls, retention cleanup, quota exhaustion, costs, and backups. `/ready` is not a worker/provider availability monitor.

## Selling the First Paid Pilots

1. The buyer submits `/pilot` with team size and a coaching goal.
2. An operator runs `python -m app.pilots list` against the deployment database and reviews the request. There is no automatic lead notification; check this queue as part of operations.
3. Agree on the scope, pilot price, call volume, retention, recording permissions, rubric, success measures, and support expectations. Do not promise a revenue lift.
4. Issue the invoice using the chosen invoicing service, then record it:

   ```bash
   python -m app.pilots invoice --id REQUEST_ID --reference EXTERNAL_INVOICE_REFERENCE
   ```

5. After confirming actual payment externally, record it:

   ```bash
   python -m app.pilots paid --id REQUEST_ID
   ```

6. Verify the buyer's private workspace ID, then explicitly enable processing for that paid pilot:

   ```bash
   python -m app.pilots enable --id REQUEST_ID --organization-id WORKSPACE_ID
   ```

7. Onboard the workspace, invite the reps, and review results together at the end. To suspend future processing:

   ```bash
   python -m app.pilots disable --organization-id WORKSPACE_ID
   ```

Invoice status is an operator record, not a payment gateway. Signup and the synthetic sample are free; real processing requires explicit operator approval after payment. One paid request can be linked to one workspace. There are no automatic charges, invoice emails, subscription renewals, or payment webhooks.

## Evaluation and Pilot Measurement

Create a consented, redacted JSONL case set with stable IDs, source segments/transcripts, a full rubric, and human `expected_scores` for every category. Use null when behavior is not observable. Have two managers label a small representative set independently, resolve disagreements, and retain a held-out set rather than tuning every example.

Store predictions separately as `{"id":"case-id","output":{...}}`. The evaluator makes no network or model calls:

```bash
python -m app.evaluation CASES.jsonl PREDICTIONS.jsonl
```

It reports rejected/missing outputs, grounding acceptance, observed rubric coverage, category mean absolute error, and agreement on observed versus unobserved categories. An accepted exact quote does not prove that the score is semantically right. The checked-in fixtures only test the tool and are explicitly synthetic.

For a real 30-day pilot, record the starting rubric version and call-review routine. Use the dashboard's persisted assignments/reviews, compatible next-call skill checks, usefulness ratings, and optional manager-reported review seconds. Treat these as process/quality indicators. Capture business outcomes from an agreed CRM or buyer-confirmed source outside the app, with definitions and a baseline. Do not infer win-rate or revenue improvement from a higher coaching score.

## Verified Locally

The implementation was checked with isolated SQLite and PostgreSQL databases, migration upgrade/downgrade/reapply, backend regression tests (60 passed on each database), frontend proxy tests (5 passed), TypeScript, and static export of all 18 routes. Next.js 16.4.3 resolves the critical production advisory; the production audit now reports zero vulnerabilities. The full audit still reports three moderate issues in the Tailwind 3 development dependency chain; its automatic fix requires a breaking Tailwind 4 migration, which was not applied. Next.js also warns that React 18 support will be removed in Next.js 17. Browser QA verified signup, company context, the synthetic sample scorecard, mobile navigation, and no horizontal overflow at 320px and 390px. Screenshot capture timed out in the browser tool, so this was not a visual screenshot review. Live model/AWS processing, SES delivery, cloud deployment, and real customer outcomes require the configured launch checks above.
