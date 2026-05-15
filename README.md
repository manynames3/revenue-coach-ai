# RevenueCoach AI

SaaS-style sales call coaching platform for local service businesses, real estate investor teams, contractors, and home service sales teams.

## Stack

- **Backend**: FastAPI, Python, SQLAlchemy, Postgres
- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **AI**: GLM 5.1 via Z.AI OpenAI-compatible API
- **Transcription**: AWS Transcribe (Phase 3+)

## Local Development

### Prerequisites

- Docker & Docker Compose
- (Optional) Z.AI API key for real AI analysis

### Quick Start

```bash
# Clone and start everything
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Postgres: localhost:5432

### Environment

Copy `.env.example` to create a `.env` file. By default, the app runs in mock AI mode (no API key needed).

```bash
cp .env.example .env
```

To enable real AI analysis, set your Z.AI API key:

```
ZAI_API_KEY=your_key_here
MOCK_AI=false
```

### Demo Flow

1. Open http://localhost:3000
2. Go to **Reps** → add a sales rep
3. Go to **New Call** → select rep, paste a transcript, create call
4. Click **Analyze with GLM 5.1** to run AI analysis
5. View the full scorecard on the call detail page
6. Copy follow-up SMS or email
7. Check **Dashboard** for overview stats

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /reps | Create a rep |
| GET | /reps | List reps |
| POST | /calls | Create a call |
| GET | /calls | List calls |
| GET | /calls/{id} | Get call with analysis |
| POST | /calls/{id}/analyze | Run AI analysis |
| GET | /dashboard/overview | Dashboard stats |

## Project Structure

```
backend/
  app/
    main.py              # FastAPI app
    config.py            # Settings
    database.py          # SQLAlchemy setup
    models/              # DB models
    schemas/             # Pydantic schemas
    routes/              # API routes
    services/            # Business logic
      glm_client.py      # GLM 5.1 API client
      sales_analyzer.py  # Sales analysis service
    prompts/
      sales_call_analysis.py  # AI prompt templates
frontend/
  pages/                 # Next.js pages
  components/            # React components
  styles/                # Global CSS
docker-compose.yml
```

## Roadmap

- Phase 1: Transcript-only analysis (✅ MVP)
- Phase 2: Product UX polish
- Phase 3: Audio upload + AWS Transcribe
- Phase 4: AWS Deployment (ECS, RDS, S3)
- Phase 5: Portfolio polish
