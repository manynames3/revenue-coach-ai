import uuid
from typing import Any

import boto3
from botocore.config import Config

from app.config import settings


class TranscriptionService:
    def __init__(self):
        self.region = settings.aws_region
        self.bucket = settings.aws_s3_bucket
        
        # Configure boto3 with optional credentials
        session_params = {}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session_params = {
                "aws_access_key_id": settings.aws_access_key_id,
                "aws_secret_access_key": settings.aws_secret_access_key,
            }
        
        self.s3 = boto3.client("s3", region_name=self.region, **session_params)
        self.transcribe = boto3.client("transcribe", region_name=self.region, **session_params)

    def generate_presigned_post(self, file_name: str, file_type: str) -> dict[str, Any]:
        """Generate a presigned POST URL to upload a file directly to S3."""
        key = f"uploads/{uuid.uuid4()}-{file_name}"
        return self.s3.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={"Content-Type": file_type},
            Conditions=[{"Content-Type": file_type}],
            ExpiresIn=3600,
        )

    def start_transcription_job(self, s3_uri: str, job_name: str) -> str:
        """Start an Amazon Transcribe job."""
        self.transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={"MediaFileUri": s3_uri},
            LanguageCode="en-US",  # Default to US English
            OutputBucketName=self.bucket,
            OutputKey=f"transcripts/{job_name}.json",
            Settings={"ShowSpeakerLabels": True, "MaxSpeakerLabels": 2},
        )
        return job_name

    def get_job_status(self, job_name: str) -> dict[str, Any]:
        """Check the status of a transcription job."""
        response = self.transcribe.get_transcription_job(TranscriptionJobName=job_name)
        return response["TranscriptionJob"]

    def get_transcript_text(self, job_name: str) -> str:
        """Retrieve the final transcript text from S3."""
        key = f"transcripts/{job_name}.json"
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        import json
        data = json.loads(response["Body"].read().decode("utf-8"))
        
        # Combine speaker results into a single transcript string
        transcripts = data.get("results", {}).get("transcripts", [])
        if transcripts:
            return transcripts[0].get("transcript", "")
        return ""
