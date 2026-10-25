# Privacy and Security

This document describes application controls, not a compliance certification or legal opinion.

## Implemented Controls

- Private organization scope on every call, rep, account, coaching, and dashboard query.
- Manager/rep permissions, suspended-seat enforcement, and no client-selected tenant authority.
- Salted PBKDF2-SHA256 passwords, hashed session tokens, HttpOnly expiring cookies, CSRF checks, and explicit CORS origins.
- Expiring, single-use invitation/recovery links; logout and password changes revoke sessions.
- Server-side consent confirmation before call intake, audio authorization, and transcription when required by policy.
- Server-created, tenant/call-scoped upload keys, audio MIME allowlist, 100 MB presigned size limit, and expiring forms.
- Optional email, formatted-phone, and long-number redaction before call persistence/model processing; enabling it also redacts existing call/analysis/assignment text.
- Independently running retention cleanup and explicit deletion, with artifact cleanup before database removal.
- Audit events for identity, settings, call/job, coaching, and retention changes; event metadata does not include transcripts or passwords.
- Persistent limits for signup/login, pilot requests, call creation, upload authorization, invitations, and analysis.
- Operator approval before real model/audio processing; workspace managers cannot grant themselves paid-service access.

## What Leaves the Application

Real model scoring sends transcript segments, the team rubric, and company context to the configured Z.AI endpoint. Audio is uploaded directly to S3 and processed by Amazon Transcribe. Optional recovery emails use SES. Operator-issued invoices use an external service chosen by the operator.

The synthetic sample does not make a model request. `MOCK_AI=true` disables real-call scoring instead of fabricating results. Presigned upload permissions still require a private session.

## Redaction Boundaries

Contact redaction is not full anonymization. Names, companies, health information, business secrets, and unusual identifier formats can remain. Speaker labels and timestamps are retained. Account emails and pilot contacts are necessary identity/contact records and are not replaced with redaction markers.

Record identifiers and validated rubric keys remain intact; redaction targets the human-facing text, not relational links or scoring-category identity.

When enabled for audio, redaction occurs after speech-to-text; AWS necessarily receives the original recording first. The worker deletes raw audio and raw transcript artifacts before exposing the redacted transcript as ready. Cleanup failures keep the operation pending for retry.

## Retention and Deletion

Workspace retention applies to call age and deletes the transcript, scorecard, raw stored AI JSON, jobs, source-call coaching assignments, and linked current audio/transcription artifacts. It does not delete user accounts, pilot leads, invoices, or audit records.

Explicit deletion returns an error and keeps the call if artifact cleanup fails. Retention audits failures and retries on subsequent worker runs. Comparison scores lose verification when their later source call is deleted.

Database backups, logs, S3 object versions, legal holds, and external provider retention are not purged by an application row deletion. Operators must configure those separately and accurately disclose the resulting policy.

Presigned upload forms expire after one hour and cannot be revoked individually. Configure S3 lifecycle/orphan cleanup for abandoned uploads, including an upload that arrives after its call was deleted. Application deletion only removes currently linked artifacts; it is not a promise that every object version or outstanding upload permission has been revoked.

## Required Before a Real-Data Pilot

- Configure HTTPS, Secure cookies, exact production origins, the same-origin Pages proxy, and matching proxy secrets.
- Configure verified SES recovery delivery, appropriate IAM, and operational support; test expired/revoked links.
- Use a private encrypted S3 bucket and PostgreSQL database, least-privilege roles, managed secrets, backups, and restore tests.
- Run and monitor the worker/scheduler; alert on stuck jobs, cleanup failures, latency, and quota/cost usage.
- Obtain appropriate recording/upload permissions and review external providers' processing terms.
- Review abuse controls for public signup/lead forms. Email verification, MFA, SSO, CAPTCHA, and account deletion are not implemented.
- Use human-reviewed, consented call annotations for quality evaluation. Do not treat sample scores as validated customer outcomes.

See the [operating runbook](product-readiness.md) for configuration and launch checks.
