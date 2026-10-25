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

    def generate_presigned_post(self, file_name: str, file_type: str, prefix: str = "uploads/") -> dict[str, Any]:
        """Generate a presigned POST URL to upload a file directly to S3."""
        self.validate_audio_type(file_type)
        safe_file_name = Path(file_name).name.replace("/", "-")
        key = f"{prefix}{uuid.uuid4()}-{safe_file_name}"
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

    def get_transcript_segments(self, job_name: str) -> list[dict]:
        """Retrieve the final transcript text from S3."""
        key = f"transcripts/{job_name}.json"
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        import json
        data = json.loads(response["Body"].read().decode("utf-8"))
        
        results = data.get("results", {})
        speaker_by_start = {}
        for segment in results.get("speaker_labels", {}).get("segments", []):
            for item in segment.get("items", []):
                speaker_by_start[item.get("start_time")] = segment.get("speaker_label", "unknown")
        segments = []
        for item in results.get("items", []):
            alternatives = item.get("alternatives", [])
            if not alternatives:
                continue
            text = alternatives[0].get("content", "")
            if item.get("type") == "punctuation":
                if segments:
                    segments[-1]["text"] += text
                continue
            start = float(item["start_time"]) if item.get("start_time") else None
            end = float(item["end_time"]) if item.get("end_time") else None
            speaker = item.get("speaker_label") or speaker_by_start.get(item.get("start_time"), "unknown")
            gap = start is not None and segments and segments[-1].get("end_seconds") is not None and start - segments[-1]["end_seconds"] > 3
            if not segments or segments[-1]["speaker"] != speaker or gap:
                segments.append({"id": f"s{len(segments) + 1}", "speaker": speaker, "text": text,
                                 "start_seconds": start, "end_seconds": end})
            else:
                segments[-1]["text"] += " " + text
                segments[-1]["end_seconds"] = end
        if not segments:
            from app.services.transcript import parse_transcript
            text = next(iter(results.get("transcripts", [])), {}).get("transcript", "")
            segments = parse_transcript(text)
        return segments

    def get_transcript_text(self, job_name: str) -> str:
        from app.services.transcript import transcript_text
        return transcript_text(self.get_transcript_segments(job_name))

    def delete_call_artifacts(self, audio_s3_key: str | None, transcription_job_id: str | None) -> list[str]:
        """Delete S3 artifacts and the Transcribe job linked to a call."""
        deleted: list[str] = []

        if transcription_job_id:
            try:
                self.transcribe.delete_transcription_job(TranscriptionJobName=transcription_job_id)
            except ClientError as exc:
                error_code = exc.response.get("Error", {}).get("Code")
                message = exc.response.get("Error", {}).get("Message", "").lower()
                missing = any(phrase in message for phrase in ("not found", "couldn't be found", "does not exist", "doesn't exist"))
                if error_code != "NotFoundException" and not (error_code == "BadRequestException" and missing):
                    raise
            transcript_key = f"transcripts/{transcription_job_id}.json"
            self.s3.delete_object(Bucket=self.bucket, Key=transcript_key)
            deleted.append(transcript_key)

        if audio_s3_key:
            self.s3.delete_object(Bucket=self.bucket, Key=audio_s3_key)
            deleted.append(audio_s3_key)

        return deleted
