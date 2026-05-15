# Architecture Decision Records

These ADRs capture the major architecture choices in RevenueCoach AI. Each record is intentionally short so reviewers can scan the reasoning quickly.

## ADR 1: Split Next.js UI and FastAPI API

Status: Accepted

Context: The product needs an interactive browser dashboard and a backend that can own database access, AWS integrations, and AI analysis calls. Keeping all logic in one frontend runtime would make secret handling and long-running integration work harder.

Decision: Use Next.js for the frontend and FastAPI for the backend, connected through REST JSON APIs and deployed locally as separate Docker Compose services.

Consequences: The UI and API can evolve independently and backend secrets stay server-side. The tradeoff is an extra service boundary, CORS configuration, and coordinated deployment work for production.

## ADR 2: Store AI Scorecards in PostgreSQL JSONB

Status: Accepted

Context: AI analysis results include nested score breakdowns, objections, buying signals, coaching notes, and follow-up drafts. The shape is structured but can evolve as coaching logic changes.

Decision: Store the core call analysis record relationally and keep nested analysis fields in PostgreSQL JSONB columns, including the raw AI JSON payload.

Consequences: The schema supports flexible nested outputs while keeping calls, reps, and organizations relational. It also keeps future analytics options open, but ties the app to PostgreSQL-specific JSONB behavior.

## ADR 3: Use Direct Browser-to-S3 Audio Uploads

Status: Accepted

Context: Sales-call audio files can be large, and routing them through the FastAPI server would increase backend memory, bandwidth, timeout, and attack-surface concerns.

Decision: Have the backend generate a presigned POST and let the browser upload audio directly to S3. The backend then starts an Amazon Transcribe job using the uploaded object key.

Consequences: The backend does not handle raw audio bytes, which keeps the API lighter. The tradeoff is more AWS setup: S3 bucket policy, CORS, IAM, and Transcribe permissions must be configured outside the app code.

## ADR 4: Use an OpenAI-Compatible GLM Client with Typed Parsing

Status: Accepted

Context: The app needs model-generated coaching output that the UI and database can trust as structured data. It also needs a local path that works without paid model access.

Decision: Call GLM 5.1 through the OpenAI Python SDK compatible interface, prompt for strict JSON, parse the result into Pydantic models, and fall back to mock AI responses when mock mode is enabled or a provider call fails.

Consequences: Provider access is isolated behind a small service class and local development remains usable. The tradeoff is that JSON validity depends on prompting and parsing instead of provider-enforced schemas.

## ADR 5: Optimize the Repository for Local Review Before Backend Infrastructure

Status: Accepted

Context: This project is meant to be easy for technical reviewers to inspect and run. Full backend infrastructure would add a lot of configuration before the core product and architecture are clear, while the frontend can be statically hosted.

Decision: Use Docker Compose for the reviewable runtime, development servers in the local frontend/backend containers, startup table creation for the initial schema, and Cloudflare Pages static export for frontend hosting.

Consequences: Reviewers can run the app with a small local setup, and the frontend has a simple static deployment path. Production backend concerns remain explicit follow-up work: migrations, auth, tighter CORS, managed secrets, infrastructure provisioning, and production-grade process management.
