import boto3
import os
from dotenv import load_dotenv

load_dotenv()

class R2Client:
    def __init__(self):
        self._setup_s3_client()

    def _setup_s3_client(self):
        self.s3 = boto3.client(
            service_name='s3',
            endpoint_url=os.getenv('R2_ENDPOINT_URL'),
            aws_access_key_id=os.getenv('R2_AVATARS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_AVATARS_SECRET_ACCESS_KEY'),
            region_name="auto",
        )
    

    def upload_file(self, user_id: int, file_bytes: bytes) -> str:
        """Uploads a file to R2 and returns the stored object key (no leading slash)."""
        key = f"avatars/{user_id}.webp"

        try:
            self.s3.put_object(
                Bucket=os.getenv('R2_AVATARS_BUCKET_NAME'),
                Key=key,
                Body=file_bytes,
                ContentType='image/webp',
                CacheControl='no-cache',
            )
            return key

        except Exception:
            raise RuntimeError("Failed to upload file to R2.")