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

Status: Superseded by ADR 8 for fallback and scoring behavior

Context: The app needs model-generated coaching output that the UI and database can trust as structured data. It also needs a local path that works without paid model access.

Decision: Originally, call GLM 5.1 through the OpenAI-compatible SDK, parse typed JSON, and fall back to deterministic mock responses. The current implementation keeps the client/parsing boundary but removes silent real-call fallback.

Consequences: Provider access remains isolated. The old fallback obscured failures and could attach unsupported evidence to real calls; it is no longer used.

## ADR 5: Use Serverless AWS for the Public Demo

Status: Accepted

Context: This project is meant to be easy for technical reviewers to inspect and run, but a recruiter-facing README also benefits from a public URL that exercises the real backend API. The backend already has a clean FastAPI/PostgreSQL boundary, and local Docker is not required for AWS Lambda packaging.

Decision: Keep Docker Compose as the local review runtime, export the frontend to Cloudflare Pages, and deploy the FastAPI app to AWS API Gateway plus Lambda using Mangum. Use private RDS PostgreSQL for persistence and an S3 bucket for audio uploads.

Consequences: The same FastAPI routes and ORM work locally and on Lambda. The later implementation adds private sessions, exact CORS, a same-origin Pages proxy, and an independent worker. Infrastructure provisioning, managed secrets, monitoring, and budgets still require operator setup.

## ADR 6: Add Question-Led Sales Psychology as Structured Output

Status: Accepted

Context: High-ticket sales coaching needs more than a generic performance score. Managers need to know whether the rep uncovered emotional motivation, consequence of inaction, decision criteria, money readiness, and resistance created by the rep's approach.

Decision: Extend the AI response schema with a structured `sales_psychology` object. Store it as JSONB, validate it with Pydantic, and render it as a dedicated scorecard panel with better questions, objection psychology, and next-call strategy.

Consequences: The product becomes more useful for high-ticket closers and sales coaches without hard-coding a proprietary script. The tradeoff is a larger AI contract that needs prompt discipline, tests, and versioned migrations as the rubric evolves.

## ADR 7: Private Workspaces with Server-Owned Scope

Status: Accepted

Context: Authorized sales conversations must not be readable through anonymous requests or a client-selected organization ID.

Decision: Use salted password hashes, hashed expiring sessions, HttpOnly cookies, CSRF checks, and explicit manager/rep authorization. Determine tenant scope from the authenticated user. Use a narrow Pages proxy for same-origin production cookies.

Consequences: Each API boundary enforces ownership and rep scope; invitations and suspended seats have a real lifecycle. Operators must configure HTTPS, matching proxy secrets, recovery delivery, and abuse controls. Email verification, SSO, and MFA are not included.

## ADR 8: Grounded, Versioned Scoring on a Leased Worker

Status: Accepted

Context: Synchronous model work is vulnerable to HTTP/runtime timeouts. Canned fallback and hard-coded score shapes obscure failures and custom rubric behavior.

Decision: Save one database job per call with a rubric/context snapshot; process it under a bounded lease. Validate typed output and exact segment quotations, overwrite generated source metadata, and calculate weighted totals from observed categories only. Keep synthetic onboarding separate and fail real-call errors explicitly.

Consequences: Scoring and retention do not depend on an open browser. Old versions stay inspectable and compatible skill comparisons are constrained. The queue suits pilot volume; crashes can repeat external requests, and semantic scoring quality still requires human evaluation.

## ADR 9: Scope-First Pilots with Manual Invoicing

Status: Accepted

Context: Early paid pilots need an agreed coaching goal and operating scope before committing to recurring SaaS billing.

Decision: Persist pilot requests and let an operator confirm scope/price, issue an external invoice, record actual payment, and explicitly enable processing for the agreed workspace. New signups cannot authorize paid model/audio usage. Measure coaching completion, usefulness, and comparable skill scores without asserting revenue causation.

Consequences: No payment credentials or new billing dependency are required. Invoice delivery, queue review, payment confirmation, and access policy remain manual; recurring subscriptions and proven customer ROI are not implied.
