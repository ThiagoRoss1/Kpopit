import boto3
import os
from dotenv import load_dotenv

load_dotenv()

AVATAR_SETTINGS = ("R2_ENDPOINT_URL", "R2_AVATARS_ACCESS_KEY_ID", "R2_AVATARS_SECRET_ACCESS_KEY",
                   "R2_AVATARS_BUCKET_NAME", "R2_AVATARS_PREFIX")


class R2Client:
    @staticmethod
    def avatars_configured() -> bool:
        """True when every avatar-bucket setting is present (never locally without R2)."""
        return all(os.getenv(name) for name in AVATAR_SETTINGS)

    @staticmethod
    def avatar_keys(user_id: int, avatar_url: str | None) -> list[str]:
        """The user's uploaded-avatar objects: the key uploads write and the stored one if it is in
        the avatars prefix. Idol photos used as avatars live elsewhere and are never included."""
        prefix = f"{os.getenv('R2_AVATARS_PREFIX')}/"
        keys = [f"{prefix}{user_id}.webp"]
        if avatar_url and avatar_url.startswith(prefix) and avatar_url not in keys:
            keys.append(avatar_url)
        return keys

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
        key = f"{os.getenv('R2_AVATARS_PREFIX')}/{user_id}.webp"

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
    def delete_files(self, keys: list[str]) -> None:
        """Delete objects from the avatars bucket (a missing key is not an error)."""
        if not keys:
            return
        self.s3.delete_objects(
            Bucket=os.getenv('R2_AVATARS_BUCKET_NAME'),
            Delete={"Objects": [{"Key": key} for key in keys], "Quiet": True},
        )
