# Architecture

RevenueCoach AI is a three-tier web application with an external AI/audio processing boundary. The Next.js frontend handles dashboard, rep, and call workflows. The FastAPI backend owns the REST API, relational data model, AI analysis orchestration, and AWS transcription integration. PostgreSQL stores reps, calls, transcripts, and structured scorecards.

## Container Diagram

```mermaid
flowchart LR
    manager["Person: Sales manager or team lead"]

    subgraph browser["Browser"]
        frontend["Container: Next.js UI<br/>React, TypeScript, Tailwind<br/>Dashboard, reps, calls, scorecards"]
    end

    backend["Container: FastAPI API<br/>Python, SQLAlchemy, Pydantic<br/>REST endpoints and service orchestration"]
    db[("Container: PostgreSQL<br/>Relational records plus JSONB scorecards")]
    s3[("External container: Amazon S3<br/>Audio uploads and transcript JSON")]
    transcribe["External service: Amazon Transcribe<br/>Async speech-to-text jobs"]
    glm["External service: Z.AI GLM 5.1<br/>OpenAI-compatible chat completions"]

    manager --> frontend
    frontend -->|"REST JSON"| backend
    frontend -->|"Presigned POST audio upload"| s3
    backend -->|"SQLAlchemy ORM"| db
    backend -->|"Chat completion request"| glm
    backend -->|"Start and poll transcription job"| transcribe
    transcribe -->|"Writes transcript output"| s3
    backend -->|"Reads completed transcript JSON"| s3
```

## Runtime Flow

### Transcript Analysis

1. The user creates a rep and call record from the Next.js UI.
2. For transcript-first calls, the frontend posts call metadata and transcript text to `POST /calls`.
3. The user triggers `POST /calls/{call_id}/analyze`.
4. FastAPI loads the call, sends the transcript through `SalesAnalyzer`, and either calls GLM 5.1 or returns a mock result when mock mode is enabled.
5. The AI response is parsed into Pydantic models, stored in the `call_analyses` table, and returned to the UI as a scorecard.
6. The dashboard reads aggregate metrics from `/dashboard/overview`.

### Audio Upload and Transcription

1. The frontend requests `POST /calls/upload-url` with the file name and MIME type.
2. FastAPI returns a time-limited S3 presigned POST form.
3. The browser uploads the audio file directly to S3.
4. The frontend creates the call record and asks FastAPI to start transcription with `POST /calls/{call_id}/transcribe`.
5. FastAPI starts an Amazon Transcribe job and stores the job id on the call.
6. The call detail page polls `GET /calls/{call_id}/transcribe/status`.
7. When transcription completes, FastAPI reads the transcript JSON from S3 and persists transcript text to the call.
8. The user can then trigger the same AI analysis flow used by transcript-first calls.

## Deployment Shape

Local development uses Docker Compose:

- `frontend`: Node 20 Alpine image running the Next.js development server on port `3000`.
- `backend`: Python 3.12 image running Uvicorn with reload on port `8000`.
- `db`: PostgreSQL 16 Alpine on port `5432` with a named volume.

The frontend can also be exported as static files for Cloudflare Pages. `frontend/next.config.js` uses static export settings, and `frontend/wrangler.toml` points Cloudflare Pages at the `out` build directory. This deploys only the browser app; `NEXT_PUBLIC_API_URL` must point to a separately deployed FastAPI backend.

External dependencies are not provisioned by Compose. Real AI analysis requires Z.AI configuration, and the audio flow requires AWS credentials, an S3 bucket, bucket CORS policy, and Amazon Transcribe permissions. Production backend deployment is listed on the roadmap, but this repository does not yet include Terraform, ECS/Fargate configuration, managed secrets, production CORS policy, or migration automation.

## Key Constraints

- Startup schema creation is handled through SQLAlchemy metadata in `app.main`; migrations are not yet checked in.
- The app creates a default organization and does not implement authentication, authorization, or tenant isolation.
- Development CORS is permissive.
- The backend avoids handling raw audio bytes, but it does read transcription output from S3 after Amazon Transcribe completes.
- The AI contract depends on strict JSON prompting and Pydantic validation rather than provider-native structured output enforcement.
- `MOCK_AI=true` is useful for local development but can hide provider or prompt failures until a real API key is used.
