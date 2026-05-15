import uuid
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError

from app.config import settings


ALLOWED_AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
}


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

    @staticmethod
    def validate_audio_type(file_type: str) -> None:
        if file_type not in ALLOWED_AUDIO_TYPES:
            allowed = ", ".join(sorted(ALLOWED_AUDIO_TYPES))
            raise ValueError(f"Unsupported audio type '{file_type}'. Allowed types: {allowed}")

    def generate_presigned_post(self, file_name: str, file_type: str) -> dict[str, Any]:
        """Generate a presigned POST URL to upload a file directly to S3."""
        self.validate_audio_type(file_type)
        safe_file_name = Path(file_name).name.replace("/", "-")
        key = f"uploads/{uuid.uuid4()}-{safe_file_name}"
        return self.s3.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={"Content-Type": file_type},
            Conditions=[
                {"Content-Type": file_type},
                ["content-length-range", 1, settings.max_audio_upload_bytes],
            ],
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

    def delete_call_artifacts(self, audio_s3_key: str | None, transcription_job_id: str | None) -> list[str]:
        """Delete S3 artifacts and the Transcribe job linked to a call."""
        deleted: list[str] = []

        if audio_s3_key:
            self.s3.delete_object(Bucket=self.bucket, Key=audio_s3_key)
            deleted.append(audio_s3_key)

        if transcription_job_id:
            transcript_key = f"transcripts/{transcription_job_id}.json"
            self.s3.delete_object(Bucket=self.bucket, Key=transcript_key)
            deleted.append(transcript_key)
            try:
                self.transcribe.delete_transcription_job(TranscriptionJobName=transcription_job_id)
            except ClientError as exc:
                error_code = exc.response.get("Error", {}).get("Code")
                if error_code not in {"NotFoundException", "BadRequestException"}:
                    raise

        return deleted
