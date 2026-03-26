# Migrations management script
import psycopg
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DB_URL")

def apply_migrations():
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:

                # -- Schema migrations -- 
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY NOT NULL,
                    migration_filename TEXT NOT NULL UNIQUE,
                    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                conn.commit()

                cursor.execute("""SELECT migration_filename FROM schema_migrations""")
                applied_migrations = {row[0] for row in cursor.fetchall()}

                migration_dir = Path(__file__).parent
                migration_files = sorted(migration_dir.glob("*.sql"))

                for migration_file in migration_files:
                    migration_name = migration_file.name

                    if migration_name in applied_migrations:
                        print(f"Filename already applied: {migration_name}")
                        continue

                    print(f"Applying migration: {migration_name}")

                    with open(migration_file, "r", encoding="utf-8") as file:
                        migration_sql = file.read()
                        up_sql = migration_sql.split('-- DOWN')[0]

                    try:
                        cursor.execute(up_sql)

                        cursor.execute("""
                            INSERT INTO schema_migrations (migration_filename)
                            VALUES (%s)
                        """, (migration_name,)
                        )
                        conn.commit()
                        print(f"Migration applied successfully: {migration_name}")

                    except Exception as e:
                        conn.rollback()
                        print(f"Error applying migration {migration_name}: {e}")
                        break
        
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    apply_migrations()