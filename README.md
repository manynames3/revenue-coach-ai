# RevenueCoach AI

RevenueCoach AI helps consultative sales teams turn authorized call transcripts or audio recordings into evidence-backed coaching and focused practice. Managers can configure a weighted team rubric, inspect the transcript excerpts behind a score, assign an exercise, review a rep's response, and compare the same skill on a later call. The application uses Next.js and TypeScript, a FastAPI API, PostgreSQL JSONB, a database-backed worker, Amazon S3/Transcribe, and Z.AI GLM through an OpenAI-compatible client.

[Product website](https://revenue-coach-ai.pages.dev) · [Illustrative walkthrough](https://revenue-coach-ai.pages.dev/demo)

The public site may run an earlier release. Source documentation describes the implementation in this repository, not a guarantee that a particular deployment is active. The [May 2026 AWS shutdown record](docs/aws-shutdown-2026-05-22.md) preserves the earlier review deployment's history.

## About

Built for sales managers, enablement leads, and high-ticket sellers who need specific coaching without listening to every call from beginning to end. The product connects call review to follow-through: source excerpts, better questions, human-reviewed follow-up drafts, assigned practice, and next-call skill checks. Its question-led rubric draws on general consultative sales principles; it is not an official implementation of a proprietary methodology.

## Tech Stack

- Frontend: Next.js 16, React 18, TypeScript, Tailwind CSS, Lucide icons
- Backend: Python, FastAPI, SQLAlchemy, Pydantic, Alembic
- Persistence: PostgreSQL with JSONB; SQLite for lightweight local tests
- AI: Z.AI GLM 5.1 through the OpenAI Python SDK's compatible interface
- Audio: S3 presigned POST uploads and asynchronous Amazon Transcribe jobs
- Runtime: Docker Compose locally; Cloudflare Pages/Functions and AWS API Gateway/Lambda-compatible handlers for deployment
- Quality: pytest, TypeScript checks, frontend proxy tests, static export, and GitHub Actions

## Engineering Highlights

- Private workspaces: hashed passwords and session tokens, HttpOnly cookies, CSRF protection, expiring invitations, manager/rep permissions, and server-owned tenant scope.
- Cost controls: new workspaces can review a sample, but only an operator can enable real model/audio processing after confirming a paid pilot.
- Honest scoring failures: real calls never receive a canned score when a provider is unavailable. The saved call can be retried; synthetic coaching is explicitly labeled.
- Grounded scorecards: every scored category needs an exact excerpt from a source segment. Speaker and timestamp metadata come from the transcript, not the model.
- Configurable evaluation: weights, behavior anchors, category keys, rubric versions, and company context are saved with each analysis. Unobserved categories stay null and are excluded from the weighted total.
- Durable background work: idempotent jobs use database leases and bounded retries. Transcription polling and retention continue without an open browser.
- Privacy enforcement: consent is checked at intake; optional contact-pattern redaction happens before call persistence and model processing. Cleanup errors preserve records for retry.
- Coaching follow-through: assignment, practice submission, manager review, and same-rep/same-rubric skill comparisons are persisted.
- Measured pilot feedback: manager usefulness ratings and reported review time exclude synthetic and legacy scorecards. Offline evaluation compares saved outputs with human labels.

## Architecture

[Container diagram and runtime flows](docs/architecture.md) · [ADRs](docs/adrs/README.md) · [Privacy boundaries](docs/privacy-and-security.md) · [Pilot and deployment runbook](docs/product-readiness.md) · [Revenue use cases](docs/revenue-use-cases.md)

The homepage is public; `/dashboard` and the coaching workspace require sign-in. The browser calls an authenticated REST API. PostgreSQL stores workspace data, versioned scorecards, and jobs. A separate worker performs model analysis, transcription completion, and retention cleanup. On Pages, a narrow same-origin API proxy forwards requests to the backend so sessions do not depend on third-party cookies.

## Local Setup

1. Create a local environment from the example:

   ```bash
   cp .env.example .env
   ```

2. Start the frontend, API, worker, and database:

   ```bash
   docker compose up --build
   ```

3. Open [localhost:3000/signup](http://localhost:3000/signup), create a workspace, and review the labeled sample.

The sample requires no external model call. With `MOCK_AI=true`, real-call analysis is intentionally unavailable. Real processing also requires operator approval for the workspace, `MOCK_AI=false`, and a server-side `ZAI_API_KEY`. Audio requires an existing private S3 bucket, bucket CORS, and Transcribe permissions. Password recovery requires an SES-verified `AUTH_EMAIL_FROM` and mail permissions.

The API is at [localhost:8000](http://localhost:8000/docs). Containers run migrations before startup. Back up existing databases; do not delete a volume to fix a migration failure. See the runbook for adopting an older, unversioned deployment.

## Validation

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
python -m app.evaluation evals/synthetic-cases.jsonl evals/synthetic-predictions.jsonl

cd ../frontend
npm ci
npm test
npm exec -- tsc --noEmit
npm run build
npm audit --omit=dev

cd ..
git diff --check
```

The evaluation fixtures are synthetic examples, not evidence of model quality on customer calls. The [evaluation protocol](docs/product-readiness.md#evaluation-and-pilot-measurement) describes how to collect real labels safely.

Set `TEST_DATABASE_URL` only to a dedicated disposable PostgreSQL database; test fixtures reset its application tables. Production data must never be used as the test target.

## Project Structure

```text
backend/
  alembic/         Versioned schema migrations
  app/
    routes/       Auth, account, calls, coaching, dashboard, onboarding, pilots
    services/     Source validation, worker jobs, privacy, transcription, email
    models/       Workspace, identity, call, scorecard, and job persistence
    schemas/      Validated API and analysis contracts
    worker.py     Persistent worker and scheduled Lambda handler
    evaluation.py Offline human-label comparison
    pilots.py     Operator invoice tracking
  evals/          Explicitly synthetic evaluation examples
  tests/          Auth, tenant, scoring, audio, privacy, and coaching tests
frontend/
  pages/          Public website, onboarding, account, and coaching workspace
  functions/      Pages same-origin API proxy
  components/     Shared branding, authentication, and scorecard UI
  tests/          Proxy security and failure tests
docs/             Architecture, ADRs, privacy, and operating runbooks
.github/          CI verification
docker-compose.yml
```

## Deployment

Deploy and migrate the backend first, then start a worker or schedule `app.worker.handler`. API requests alone do not drain the queue.

For Cloudflare Pages, use root `frontend`, build `npm run build`, and output `out`. Set the build variable `NEXT_PUBLIC_API_URL=/api`. Configure the Function's `API_ORIGIN` and secret `PROXY_SECRET`; set the matching secret, exact CORS origin, HTTPS frontend URL, and Secure/Lax cookies on the backend. The [runbook](docs/product-readiness.md#deployment-order) contains the full configuration and smoke checks.

AWS resources, IAM, scheduling, backups, encryption policy, and secret rotation remain deployment responsibilities. This repository does not claim reproducible Terraform/CDK infrastructure.

## Paid Pilots and Limitations

A pilot request is recorded at `/pilot`. The operator confirms scope and price, issues an invoice externally, records its payment, and enables processing for the agreed workspace. There is no automatic charge or recurring billing.

This is a pilot-ready implementation, not a claim of enterprise certification or proven ROI. Scores are coaching judgments, not close probabilities. Contact-pattern redaction does not fully anonymize a conversation. Managed SSO/MFA, verified-email signup, CRM integrations, real-time roleplay, and independently validated customer outcomes are not implemented. Review the [privacy and launch requirements](docs/privacy-and-security.md) before processing sensitive customer data.
