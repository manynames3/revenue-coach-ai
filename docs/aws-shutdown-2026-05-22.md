# AWS Shutdown Record - 2026-05-22

RevenueCoach AI was deployed as a public portfolio review build using Cloudflare Pages for the static frontend and AWS for the API, database, audio upload, and transcription path.

This note records the validated deployment and the AWS cost-control shutdown performed after an AWS budget alert. The Cloudflare Pages frontend remains available as a static product walkthrough, but the AWS-backed API/database path is not intended to stay live continuously.

## Screenshots

- Product UI preview: [screenshots/revenuecoach-product-preview.png](screenshots/revenuecoach-product-preview.png)
- Live Cloudflare Pages sales page after AWS shutdown: [screenshots/revenuecoach-sales-live-2026-05-23.png](screenshots/revenuecoach-sales-live-2026-05-23.png)
- Dashboard after AWS backend shutdown: [screenshots/revenuecoach-dashboard-after-shutdown-2026-05-23.png](screenshots/revenuecoach-dashboard-after-shutdown-2026-05-23.png)

## Deployment Evidence

- Frontend URL: `https://revenue-coach-ai.pages.dev`
- Sales page URL: `https://revenue-coach-ai.pages.dev/sales`
- API Gateway URL used during validation: `https://ebticgoe71.execute-api.us-east-1.amazonaws.com`
- API health check before shutdown: `{"status":"ok"}`

## Validated Architecture

- Frontend: Cloudflare Pages static Next.js export
- API: AWS HTTP API Gateway `revenue-coach-ai-api`
- Runtime: AWS Lambda `revenue-coach-ai-api`, Python 3.12, FastAPI through Mangum
- Database: private Amazon RDS PostgreSQL 16, `db.t4g.micro`, 20 GB gp2 storage
- Storage/audio path: S3 presigned audio uploads
- Transcription path: Amazon Transcribe through an interface VPC endpoint
- Networking: private database subnet group, Lambda security group, database security group, S3 gateway VPC endpoint, Transcribe interface VPC endpoint

## Shutdown Reason

The AWS monthly budget alert was triggered by always-on infrastructure. Lambda, API Gateway, S3, and DynamoDB-style serverless services have low idle cost, but this deployment included:

- A running RDS PostgreSQL instance
- A billable Transcribe interface VPC endpoint

Those two resources were the main recurring cost drivers for this project. The shutdown keeps the implementation documented while avoiding unnecessary idle spend for a portfolio project.

## Shutdown Result

Completed on 2026-05-22:

- Deleted the billable Transcribe interface VPC endpoint `vpce-05bd259fa7c0524f3`
- Stopped the RDS PostgreSQL instance `revenue-coach-ai-postgres`

Verification on 2026-05-23:

```json
{
  "Identifier": "revenue-coach-ai-postgres",
  "Status": "stopped",
  "Class": "db.t4g.micro",
  "StorageGB": 20,
  "DeletionProtection": true
}
```

```json
[
  {
    "Id": "vpce-0ef00b0090d676bbe",
    "Service": "com.amazonaws.us-east-1.s3",
    "Type": "Gateway",
    "State": "available"
  }
]
```

The RDS database was stopped, not deleted, so the active database compute charge is off while the 20 GB storage and backups can still incur smaller charges. RDS stopped instances can also be restarted automatically by AWS after several days, so a permanent zero-idle-cost posture should either delete the DB after exporting any needed data or rebuild the backend with a lower-idle-cost data store.

Resources intentionally not treated as urgent cost drivers:

- S3 gateway VPC endpoint `vpce-0ef00b0090d676bbe` because gateway endpoints do not have the same hourly endpoint charge
- Lambda/API Gateway because idle cost is negligible compared with RDS and the interface endpoint
- Cloudflare Pages frontend because it preserves the static project walkthrough

## Rebuild Notes

The AWS resources were provisioned outside this repository. Before making this a durable production-style deployment again, codify the AWS backend with Terraform or CDK, including:

- RDS lifecycle controls or an Aurora Serverless/Postgres alternative
- Explicit teardown/runbook steps
- Cost tags activated for Cost Explorer
- Least-privilege IAM and secret rotation
- Production CORS allowlist and authentication
