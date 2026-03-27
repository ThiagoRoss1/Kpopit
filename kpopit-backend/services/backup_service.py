import subprocess
import boto3
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
DB_URL = os.getenv("DB_URL")


def sanitize_dump_for_sql_editors(local_path):
    """Remove psql meta-commands (e.g. \restrict) unsupported by SQL editors like DBeaver."""
    with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    cleaned_lines = [line for line in lines if not line.lstrip().startswith("\\")]

    with open(local_path, "w", encoding="utf-8", newline="") as f:
        f.writelines(cleaned_lines)

def postgresql_backup_to_s3():
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"

    missing = []
    if not DB_URL:
        missing.append("DB_URL")
    if not BUCKET_NAME:
        missing.append("R2_BUCKET_NAME")
    if missing:
        msg = f"Missing required environment variables: {', '.join(missing)}"
        print(msg)
        return False, msg
    
    if os.name == 'nt':
        local_path = filename
    else:
        local_path = f"/tmp/{filename}"

    try:
        subprocess.run(
            [
                'pg_dump',
                '--dbname', DB_URL,
                '--file', local_path,
                '--no-owner',
                '--no-privileges',
                '--column-inserts',
                '--serializable-deferrable',
            ],
            check=True
        )

        sanitize_dump_for_sql_editors(local_path)
        
        s3 = boto3.client(
            service_name='s3',
            endpoint_url=os.getenv("R2_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("R2_BACKUP_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("R2_BACKUP_SECRET_ACCESS_KEY"),
            region_name='auto',
        )
        
        print(f"Uploading backup {filename} to bucket {BUCKET_NAME}...")

        s3.upload_file(local_path, BUCKET_NAME, f"backups/{filename}")

        print(f"Backup {filename} uploaded successfully.")

        os.remove(local_path)
        return True, filename

    except Exception as e:
        error_msg = str(e)
        print(f"Error uploading backup: {error_msg}")
        return False, error_msg


if __name__ == "__main__":
    success, message = postgresql_backup_to_s3()
    if success:
        print(f"Backup successful: {message}")
    else:
        print(f"Backup failed: {message}")
    