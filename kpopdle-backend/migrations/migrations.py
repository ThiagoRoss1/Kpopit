# Migrations management script
import sqlite3
from pathlib import Path

DB_FILE = Path(__file__).parent.parent / "kpopdle-teste.db"

def apply_migrations():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    schema_migrations = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_filename TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """

    cursor.execute(schema_migrations)

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
            cursor.executescript(up_sql)

            cursor.execute("""
                INSERT INTO schema_migrations (migration_filename)
                VALUES (?)
            """, (migration_name,)
            )
            conn.commit()
            print(f"Migration applied successfully: {migration_name}")

        except Exception as e:
            conn.rollback()
            print(f"Error applying migration {migration_name}: {e}")
            break

    conn.close()

if __name__ == "__main__":
    apply_migrations()

