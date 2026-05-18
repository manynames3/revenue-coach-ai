# Architecture

RevenueCoach AI is a three-tier web application with an external AI/audio processing boundary. The Next.js frontend handles dashboard, rep, and call workflows. The FastAPI backend owns the REST API, relational data model, AI analysis orchestration, and AWS transcription integration. PostgreSQL stores reps, calls, transcripts, structured scorecards, and high-ticket sales psychology feedback.

The public demo deploys the frontend to Cloudflare Pages and the backend to AWS API Gateway plus Lambda, with private RDS PostgreSQL for persistence.

## Container Diagram

```mermaid
flowchart LR
    manager["Person: Sales manager or team lead"]

    subgraph edge["Cloudflare Pages"]
        frontend["Container: Static Next.js UI<br/>React, TypeScript, Tailwind<br/>Dashboard, reps, calls, scorecards"]
    end

    api_gateway["Container: AWS HTTP API Gateway<br/>HTTPS REST entrypoint"]
    backend["Container: AWS Lambda FastAPI API<br/>Python, Mangum, SQLAlchemy, Pydantic<br/>REST endpoints and service orchestration"]
    db[("Container: Amazon RDS PostgreSQL 16<br/>Relational records plus JSONB scorecards and psychology feedback")]
    s3[("External container: Amazon S3<br/>Audio uploads and transcript JSON")]
    transcribe["External service: Amazon Transcribe<br/>Async speech-to-text jobs"]
    glm["External service: Z.AI GLM 5.1<br/>OpenAI-compatible chat completions"]

    manager --> frontend
    frontend -->|"REST JSON"| api_gateway
    api_gateway -->|"Lambda proxy event"| backend
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
5. The call status moves to `analyzing` while the backend processes the transcript.
6. The AI response is parsed into Pydantic models, stored in the `call_analyses` table, and returned to the UI as a scorecard.
7. The call status moves to `analyzed`. Repeated analysis requests return the existing scorecard to avoid duplicated model output.
8. The dashboard reads aggregate metrics from `/dashboard/overview`.

The analysis contract includes a high-ticket sales psychology section. It scores trust and safety, problem clarity, emotional depth, consequence awareness, decision clarity, money readiness, urgency, and resistance management. It also returns better question suggestions, likely underlying objection concerns, and a next-call strategy.

### Audio Upload and Transcription

1. The frontend requests `POST /calls/upload-url` with the file name and MIME type.
2. FastAPI returns a time-limited S3 presigned POST form.
3. The browser uploads the audio file directly to S3.
4. The frontend creates the call record and asks FastAPI to start transcription with `POST /calls/{call_id}/transcribe`.
5. FastAPI starts an Amazon Transcribe job and stores the job id on the call.
6. The call detail page polls `GET /calls/{call_id}/transcribe/status`.
7. When transcription completes, FastAPI reads the transcript JSON from S3 and persists transcript text to the call.
8. The user can then trigger the same AI analysis flow used by transcript-first calls.

### Deletion Flow

1. The user or API client calls `DELETE /calls/{call_id}`.
2. FastAPI deletes linked audio and transcript artifacts from S3 when the call has an audio key or transcription job id.
3. The call row is deleted, and the related `call_analyses` row is removed through ORM cascade behavior.
4. The endpoint returns `204 No Content` after storage and database deletion complete.

## Lifecycle Model

Calls use explicit status values so asynchronous audio and AI work can be retried and debugged:

- `created`: call record exists, but no transcript is ready.
- `transcribing`: Amazon Transcribe job has been started.
- `transcribed`: transcript text is persisted and ready for analysis.
- `analyzing`: AI scorecard generation is in progress.
- `analyzed`: scorecard is persisted.
- `failed`: transcription or analysis failed; `failure_reason` captures the operational detail.

## Deployment Shape

Local development uses Docker Compose:

- `frontend`: Node 20 Alpine image running the Next.js development server on port `3000`.
- `backend`: Python 3.12 image running Uvicorn on port `8000`.
- `db`: PostgreSQL 16 Alpine on port `5432` with a named volume.

The backend image runs `alembic upgrade head` before starting Uvicorn. The application still has a `create_all` fallback for local development, but Alembic is the documented schema path.

The public demo uses a split serverless deployment:

- Cloudflare Pages serves the static Next.js export from `frontend/out`.
- `NEXT_PUBLIC_API_URL` is compiled into the frontend and currently points to `https://ebticgoe71.execute-api.us-east-1.amazonaws.com`.
- AWS HTTP API Gateway exposes the FastAPI app over HTTPS.
- AWS Lambda runs the FastAPI app through `backend/app/lambda_handler.py` and Mangum.
- Amazon RDS PostgreSQL stores application data in a private subnet.
- An S3 bucket stores uploaded audio and Transcribe output.
- VPC endpoints provide private Lambda access to S3 and Amazon Transcribe.
- `backend/app/migration_handler.py` supports one-off Lambda schema migration work against private RDS without exposing the database publicly.

External dependencies are not provisioned by Compose. Real AI analysis requires Z.AI configuration, and the audio flow requires AWS credentials, an S3 bucket, bucket CORS policy, and Amazon Transcribe permissions. The deployed demo uses mock AI output so the public app can be reviewed without a model key.

## Key Constraints

- Startup schema creation still exists as a local fallback, but Alembic migrations are checked in and used by the backend container.
- The app creates a default organization and does not implement authentication, authorization, or tenant isolation.
- Development CORS is permissive.
- The backend avoids handling raw audio bytes, but it does read transcription output from S3 after Amazon Transcribe completes.
- The AI contract depends on strict JSON prompting and Pydantic validation rather than provider-native structured output enforcement.
- The high-ticket sales psychology feedback is question-led and buyer-centered; it is not an official implementation of any proprietary sales methodology.
- `MOCK_AI=true` is useful for local development but can hide provider or prompt failures until a real API key is used.
- The current AWS resources were created outside Terraform/CDK. Reproducible infrastructure is a clear next step before treating the deployment as production.
