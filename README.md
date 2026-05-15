# RevenueCoach AI

RevenueCoach AI is a full-stack sales coaching application that turns sales-call transcripts or uploaded audio into structured manager scorecards. It combines a Next.js dashboard, a FastAPI service, PostgreSQL JSONB persistence, direct browser-to-S3 audio uploads, Amazon Transcribe, and GLM 5.1 analysis through an OpenAI-compatible client.

Live demo: no public deployment is currently configured. Run the project locally with Docker Compose.

## About

The app is designed for sales managers and team leads who need a repeatable way to audit calls, spot coaching opportunities, and review rep performance. Users can add reps, create call records from pasted transcripts or audio files, trigger AI coaching, and review scorecards with discovery, objection handling, closing, follow-up, manager notes, buying signals, and follow-up message drafts.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: FastAPI, Python 3.12, SQLAlchemy 2.0, Pydantic 2
- Database: PostgreSQL 16 with JSONB fields for nested AI scorecards
- AI: Z.AI GLM 5.1 through the OpenAI Python SDK's compatible client interface
- Audio pipeline: Amazon S3 presigned POST uploads and Amazon Transcribe
- Deployment/runtime: Docker Compose for local review and Cloudflare Pages static export for the frontend

## Engineering Highlights

- Direct-to-S3 audio ingestion: the API issues presigned upload forms so the browser uploads audio directly to S3 instead of proxying large files through FastAPI.
- Asynchronous transcription flow: the backend starts Amazon Transcribe jobs, the frontend polls job status, and completed transcript text is persisted back to the call record.
- Structured AI output: prompts require a strict JSON shape, responses are parsed into Pydantic models, and normalized fields plus raw model output are stored in PostgreSQL.
- Analytics-oriented persistence: call analysis data uses JSONB for nested score categories, objections, buying signals, notes, and follow-up artifacts while keeping primary entities relational.
- Local development fallback: `MOCK_AI=true` lets the full UI and API workflow run without a live model key.

## Architecture

- [Architecture overview](docs/architecture.md)
- [Architecture decision records](docs/adrs/README.md)

At a high level, the browser talks to a REST API, the API owns persistence and integrations, and external AI/audio services are isolated behind backend service classes. Local review uses a three-container Docker Compose stack; frontend static hosting is configured for Cloudflare Pages.

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

### 3. Access

- App: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

## Project Structure

```text
backend/
  app/
    routes/       FastAPI routes for calls, reps, and dashboard data
    services/     GLM analysis and AWS transcription integrations
    models/       SQLAlchemy entities
    schemas/      Pydantic request/response and AI result models
frontend/
  pages/          Next.js pages for dashboard, reps, call creation, and call detail
  components/     Shared UI components
docs/
  architecture.md
  adrs/
docker-compose.yml
```

## Deployment Model

The repository supports two deployment shapes:

- Local review: Docker Compose runs the Next.js frontend, FastAPI backend, and PostgreSQL database.
- Static frontend hosting: `frontend/next.config.js` exports the Next.js app as static files, and `frontend/wrangler.toml` configures Cloudflare Pages output to `frontend/out`.

The backend remains a separate service and must be deployed where it can reach PostgreSQL, AWS, and Z.AI. Terraform, ECS/Fargate configuration, managed secrets, production CORS policy, and migration automation are not implemented in this repo yet.

## Cloudflare Pages Deployment

The frontend is configured for static hosting on Cloudflare Pages.

1. In the Cloudflare Dashboard, go to Workers & Pages, create a Pages application, and connect this GitHub repository.
2. Use `Next.js (Static HTML Export)` as the framework preset.
3. Set the build command to `npm run build`.
4. Set the build output directory to `frontend/out`.
5. Set the root directory to `frontend`.
6. Add `NEXT_PUBLIC_API_URL` and point it to the deployed FastAPI backend.
7. Deploy from `master`.

## Known Constraints

- No authentication or role-based access control is implemented.
- The backend creates tables on startup; Alembic is listed as a dependency, but migrations are not present.
- CORS is open for development.
- Audio processing depends on external AWS S3 and Transcribe configuration that is not provisioned by this repository.
- No screenshots are currently committed.

## Roadmap

- [x] Phase 1: Transcript-only analysis MVP
- [x] Phase 2: Product UX polish and executive dashboard
- [x] Phase 3: Audio pipeline with S3 and Amazon Transcribe
- [ ] Phase 4: Production deployment with Terraform and ECS Fargate
- [ ] Phase 5: Rep-specific analytics and historical trend lines
