# RevenueCoach AI

RevenueCoach AI is a full-stack sales coaching application that turns sales-call transcripts or uploaded audio into structured manager scorecards. It combines a Next.js dashboard, a FastAPI service, PostgreSQL JSONB persistence, direct browser-to-S3 audio uploads, Amazon Transcribe, and GLM 5.1 analysis through an OpenAI-compatible client, with a high-ticket sales psychology lens for question quality, pain depth, urgency, money readiness, and resistance management.

Live frontend: [https://revenue-coach-ai.pages.dev](https://revenue-coach-ai.pages.dev)

Sales page: [https://revenue-coach-ai.pages.dev/sales](https://revenue-coach-ai.pages.dev/sales)

Public API used for validation: `https://ebticgoe71.execute-api.us-east-1.amazonaws.com`

The public review build ran the static Next.js frontend on Cloudflare Pages and the FastAPI backend on AWS API Gateway, Lambda, and RDS PostgreSQL. Demo AI scoring was configured with `MOCK_AI=true`; local or production model-backed scoring uses `ZAI_API_KEY`. The AWS backend was documented and shut down after validation to avoid ongoing RDS and VPC endpoint costs while keeping the Cloudflare Pages frontend available.

## About

The app is designed for sales managers and team leads who need a repeatable way to audit calls, spot coaching opportunities, and review rep performance. Users can add reps, create call records from pasted transcripts or audio files, trigger AI coaching, and review scorecards with discovery, objection handling, closing, follow-up, manager notes, buying signals, high-ticket psychology feedback, better question suggestions, and follow-up message drafts.

## Tech Stack

- Frontend: Next.js 16, React 18, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.12, SQLAlchemy 2.0, Pydantic 2
- Database: PostgreSQL 16 with JSONB fields for nested AI scorecards
- AI: Z.AI GLM 5.1 through the OpenAI Python SDK's compatible client interface
- Audio pipeline: Amazon S3 presigned POST uploads and Amazon Transcribe
- Deployment/runtime: Docker Compose for local review, Cloudflare Pages for the frontend, AWS API Gateway and Lambda for the public API, and Amazon RDS for managed PostgreSQL
- Quality: Alembic migrations, pytest backend coverage, and GitHub Actions CI

## Engineering Highlights

- Direct-to-S3 audio ingestion: the API issues presigned upload forms so the browser uploads audio directly to S3 instead of proxying large files through FastAPI.
- Asynchronous transcription flow: the backend tracks call state through `created`, `transcribing`, `transcribed`, `analyzing`, `analyzed`, and `failed` transitions.
- Idempotent analysis: repeated analysis requests return the existing scorecard instead of duplicating or overwriting model output.
- Structured AI output: prompts require a strict JSON shape, responses are parsed into Pydantic models, and normalized fields plus raw model output are stored in PostgreSQL.
- High-ticket psychology scoring: analysis includes trust, pain depth, consequence awareness, urgency, decision clarity, money readiness, resistance management, better questions, and objection psychology.
- Privacy-oriented deletion: `DELETE /calls/{id}` removes the call, cascades its analysis record, and deletes linked S3/Transcribe artifacts when present.
- Migration-backed schema: Alembic defines the backend schema and the backend container runs migrations before starting Uvicorn.
- CI validation: GitHub Actions runs backend migrations/tests and frontend type/build checks.
- Analytics-oriented persistence: call analysis data uses JSONB for nested score categories, objections, buying signals, notes, and follow-up artifacts while keeping primary entities relational.
- Local development fallback: `MOCK_AI=true` lets the full UI and API workflow run without a live model key.
- AWS-backed review build: the deployed API ran FastAPI through Mangum on Lambda, persisted to private RDS PostgreSQL, and used an S3 bucket for presigned audio uploads before shutdown.

## Architecture

- [Architecture overview](docs/architecture.md)
- [Architecture decision records](docs/adrs/README.md)
- [Revenue use cases](docs/revenue-use-cases.md)
- [Privacy and security notes](docs/privacy-and-security.md)
- [AWS shutdown record and screenshots](docs/aws-shutdown-2026-05-22.md)

At a high level, the browser talks to a REST API, the API owns persistence and integrations, and external AI/audio services are isolated behind backend service classes. Local review uses a three-container Docker Compose stack; the public review build used Cloudflare Pages plus AWS API Gateway, Lambda, RDS, S3, and Transcribe.

## Local Setup

### 1. Environment

Copy the example environment file and fill in the values needed for the flows you want to run:

```bash
cp .env.example .env
```

The text transcript flow can run with mock AI enabled. Real model calls require `ZAI_API_KEY`. Audio upload and transcription require AWS credentials, an existing S3 bucket, and Amazon Transcribe access to be available to the backend runtime.

### 2. Start with Docker

```bash
docker compose up --build
```

The backend container runs Alembic migrations before starting. If you already have a pre-migration local Docker volume, reset it with `docker compose down -v` before rebuilding.

### 3. Access

- App: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- Readiness check: `http://localhost:8000/ready`

## Validation

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DATABASE_URL=sqlite:///./alembic-smoke.db alembic upgrade head
rm -f alembic-smoke.db
pytest

# Frontend
cd ../frontend
npm ci
npm exec -- tsc --noEmit
npm run build
```

## Project Structure

```text
backend/
  alembic/       Database migrations
  app/
    routes/       FastAPI routes for calls, reps, and dashboard data
    services/     GLM analysis and AWS transcription integrations
    models/       SQLAlchemy entities
    schemas/      Pydantic request/response and AI result models
    lambda_handler.py  Mangum adapter for AWS Lambda
    migration_handler.py  One-off Lambda schema migration helper
  tests/         Backend API and lifecycle tests
frontend/
  pages/          Next.js pages for sales page, dashboard, practice lab, reps, call creation, and call detail
  public/         Product preview assets for public-facing pages
  components/     Shared UI components
docs/
  architecture.md
  privacy-and-security.md
  revenue-use-cases.md
  adrs/
.github/
  workflows/ci.yml
docker-compose.yml
```

## Deployment Model

The repository supports two deployment shapes:

- Local review: Docker Compose runs the Next.js frontend, FastAPI backend, and PostgreSQL database.
- Public review build: Cloudflare Pages serves the static frontend at `https://revenue-coach-ai.pages.dev`, and AWS API Gateway served the FastAPI backend at `https://ebticgoe71.execute-api.us-east-1.amazonaws.com` during validation.

The AWS backend used Lambda with `backend/app/lambda_handler.py`, private RDS PostgreSQL, an S3 audio bucket, and VPC endpoints for S3 and Transcribe. The review build used `MOCK_AI=true`; model-backed analysis requires setting `ZAI_API_KEY` in the backend runtime.

Infrastructure-as-code, managed secret rotation, custom domains, authentication, and a production CORS allowlist are not implemented in this repo yet.

## Cloudflare Pages Deployment

The frontend is configured for static hosting on Cloudflare Pages.

1. In the Cloudflare Dashboard, go to Workers & Pages, create a Pages application, and connect this GitHub repository.
2. Use `Next.js (Static HTML Export)` as the framework preset.
3. Set the build command to `npm run build`.
4. Set the build output directory to `frontend/out`.
5. Set the root directory to `frontend`.
6. Add `NEXT_PUBLIC_API_URL` and point it to the deployed FastAPI backend. The validated AWS review build used `https://ebticgoe71.execute-api.us-east-1.amazonaws.com`.
7. Deploy from `master`.

## Known Constraints

- No authentication or role-based access control is implemented.
- The AWS review build used deterministic mock AI output so it could be reviewed without a paid model key.
- The backend still creates missing tables on startup as a local-development fallback, even though Alembic migrations are now present.
- CORS is open for development.
- The public AWS transcript workflow was smoke-tested end to end; full audio transcription depends on uploading valid audio and waiting for Amazon Transcribe completion.
- AWS resources were provisioned outside this repository; Terraform/CDK is a follow-up.
- AWS resources were documented and shut down after validation to avoid ongoing RDS and VPC endpoint costs.
- Screenshots from the validated review build and post-shutdown state are committed under `docs/screenshots/`.

## Roadmap

- [x] Phase 1: Transcript-only analysis MVP
- [x] Phase 2: Product UX polish and executive dashboard
- [x] Phase 3: Audio pipeline with S3 and Amazon Transcribe
- [ ] Phase 4: Codify AWS deployment with Terraform or CDK, managed secrets, auth, and stricter CORS
- [ ] Phase 5: Rep-specific analytics and historical trend lines
