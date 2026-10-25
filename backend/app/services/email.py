import boto3
from app.config import settings


def send_password_reset(email, token):
    link = f"{settings.frontend_url}/reset-password#token={token}"
    boto3.client("ses", region_name=settings.aws_region).send_email(
        Source=settings.auth_email_from, Destination={"ToAddresses": [email]},
        Message={"Subject": {"Data": "Reset your RevenueCoach password"},
                 "Body": {"Text": {"Data": f"A password reset was requested for your account.\n\n{link}\n\nThis link expires in 30 minutes. Ignore it if you did not request a reset."}}},
    )
