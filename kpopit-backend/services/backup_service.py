import subprocess
import boto3
import os
from datetime import datetime

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
DB_PATH = os.getenv("DB_FILE")

def sqlite_backup_to_s3():
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    
    if os.name == 'nt':
        local_path = filename
    else:
        local_path = f"/tmp/{filename}"

    try:
        with open(local_path, 'w') as file:
            subprocess.run(['sqlite3', DB_PATH, f'.dump'], stdout=file, check=True)

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
    