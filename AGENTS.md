# RevenueCoach AI — Agent Notes

## Commands

```bash
# Start everything
docker compose up --build

# Backend only (for development)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend only (for development)
cd frontend && npm install && npm run dev

# Run backend tests
cd backend && python -m pytest

# Type check frontend
cd frontend && npx tsc --noEmit
```
