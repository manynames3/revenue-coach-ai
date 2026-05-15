# Privacy and Security Notes

RevenueCoach AI handles sales-call transcripts and optional audio files, so the backend is designed to keep large media out of the API process and to make deletion explicit.

## Current Controls

- Direct-to-S3 uploads keep raw audio bytes out of the FastAPI service.
- Presigned upload requests validate audio MIME type and include a maximum content-length condition.
- S3 object keys are generated server-side under an `uploads/` prefix.
- `DELETE /calls/{call_id}` deletes the call, cascades its analysis row, and removes linked S3 transcript/audio artifacts when present.
- `/health` and `/ready` separate process liveness from dependency readiness.
- `MOCK_AI=true` allows local development without sending transcripts to an external model provider.

## Production Requirements

These controls should be added before handling real customer data:

- Authentication and authorization for organizations, managers, and reps.
- Tenant isolation checks on every call, rep, dashboard, and delete endpoint.
- A retention policy for transcripts, audio, and raw AI JSON.
- Encryption and access logging policy for the S3 bucket and database.
- Production CORS allowlist instead of development-wide CORS.
- Secrets managed through the deployment platform instead of local `.env` files.
- PII redaction or minimization for transcripts before long-term storage.

## Deletion Behavior

The delete endpoint is intentionally conservative: if linked S3/Transcribe artifact deletion fails, the API returns an error instead of silently deleting only the database row. That keeps privacy failures visible to operators and avoids implying that audio was removed when storage cleanup failed.
