# Seed the database with csv data
import csv 
import os
from dotenv import load_dotenv
from services.get_db import get_manual_db

load_dotenv()
DATA_FOLDER = os.getenv("DATA_FOLDER")

# CSV files
IDOLS_CSV_FILE = os.path.join(DATA_FOLDER, "idols.csv")
GROUPS_CSV_FILE = os.path.join(DATA_FOLDER, "groups.csv")
IDOL_CAREER_CSV_FILE = os.path.join(DATA_FOLDER, "idol_career.csv")
COMPANIES_CSV_FILE = os.path.join(DATA_FOLDER, "companies.csv")
GROUP_CA_CSV_FILE = os.path.join(DATA_FOLDER, "group_company_affiliation.csv")
IDOL_CA_CSV_FILE = os.path.join(DATA_FOLDER, "idol_company_affiliation.csv")
GAME_MODES_CSV_FILE = os.path.join(DATA_FOLDER, "gamemodes.csv")
BLURRY_IDOLS_CSV_FILE = os.path.join(DATA_FOLDER, "blurry_idols.csv")

def seed_table(cursor, csv_file, table_name, columns, conflict_column=None):
    """Read data from a CSV file and insert it into a database table."""
    if conflict_column is None:
        conflict_column = ["id"]

    stats = {"inserted": 0, "updated": 0, "skipped": 0}

    with open(csv_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        # Placeholders for SQL query (e.g. "?, ?, ?  for 3 columns)
        placeholders = ", ".join(["%s" for _ in columns])

        update_cols = [col for col in columns if col not in conflict_column]
        update_set = ", ".join([f"{col} = EXCLUDED.{col}" for col in update_cols])
        where_condition = " OR ".join([f"{table_name}.{col} IS DISTINCT FROM EXCLUDED.{col}" for col in update_cols])

        # SQL Insert command (Pattern)
        insert_sql = f"""
            INSERT INTO {table_name} ({', '.join(columns)}) 
            VALUES ({placeholders})
            ON CONFLICT({", ".join(conflict_column)})
            DO UPDATE SET {update_set}
            WHERE {where_condition}
            RETURNING (xmax = 0) AS inserted_flag
        """

        # Insert each row in database - List appending
        for row in reader:
            values_by_column = {column: (row[column] if row[column] != "" else None) for column in columns}
            values = [values_by_column[column] for column in columns]

            conflict_values = [values_by_column[column] for column in conflict_column]
            key_condition = " AND ".join([f"{column} IS NOT DISTINCT FROM %s" for column in conflict_column])

            # ON CONFLICT does not catch rows when nullable conflict keys are NULL
            # In those cases, its necessary to do a manual null-safe upsert check to prevent duplicate rows
            if any(value is None for value in conflict_values):
                cursor.execute(
                    f"SELECT 1 FROM {table_name} WHERE {key_condition} LIMIT 1",
                    conflict_values,
                )
                exists = cursor.fetchone() is not None

                if exists: 
                    if update_cols:
                        manual_update_set = ", ".join([f"{col} = %s" for col in update_cols])
                        changed_condition = " OR ".join([f"{col} IS DISTINCT FROM %s" for col in update_cols])
                        update_values = [values_by_column[col] for col in update_cols]

                        cursor.execute(
                            f"""
                                UPDATE {table_name}
                                SET {manual_update_set}
                                WHERE {key_condition}
                                AND ({changed_condition})
                            """,
                            update_values + conflict_values + update_values,
                        )

                        if cursor.rowcount > 0:
                            stats["updated"] += 1
                        else:
                            stats["skipped"] += 1
                    else:
                        stats["skipped"] += 1
                else:
                    cursor.execute(
                        f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})",
                        values,
                    )
                    stats["inserted"] += 1

                continue

            cursor.execute(insert_sql, values)
            result = cursor.fetchone()

            if result:
                if result["inserted_flag"]:
                    stats["inserted"] += 1
                else:
                    stats["updated"] += 1
            else:
                stats["skipped"] += 1

        print(f"Seeded {table_name}: {stats['inserted']} inserted, {stats['updated']} updated, {stats['skipped']} skipped.")
        
def run_seed():
    with get_manual_db() as connect:
        with connect.cursor() as cursor:
            try:
                # Idols Table Seeding
                idols_columns = [
                    "id", "artist_name", "real_name", "gender", "debut_year", "nationality", 
                    "birth_date", "height", "position", "image_path", "is_published", "release_date", "image_version"
                ]
                seed_table(cursor, IDOLS_CSV_FILE, 'idols', idols_columns)

                # Groups Table Seeding
                groups_columns = [
                    "id", "name", "group_debut_year", 
                    "member_count", "generation", "fandom_name", "is_published"
                ]

                seed_table(cursor, GROUPS_CSV_FILE, 'groups', groups_columns)

                # Companies Table Seeding
                companies_columns = [
                    "id", "name", "parent_company_id", "is_published"
                ]
                seed_table(cursor, COMPANIES_CSV_FILE, 'companies', companies_columns)

                # Idol Career Table Seeding
                idol_career_columns = [
                    "idol_id", "group_id", "is_active", "start_year", "end_year"
                ]
                seed_table(cursor, IDOL_CAREER_CSV_FILE, 'idol_career', idol_career_columns, conflict_column=["idol_id", "group_id"])

                # Group Company Affiliation Table Seeding
                group_ca_columns = [
                    "group_id", "company_id", "role"
                ]
                seed_table(cursor, GROUP_CA_CSV_FILE, 'group_company_affiliation', group_ca_columns, conflict_column=["group_id", "company_id"])

                # Idol Company Affiliation Table Seeding
                idol_ca_columns = [
                    "idol_id", "company_id", "role"
                ]
                seed_table(cursor, IDOL_CA_CSV_FILE, 'idol_company_affiliation', idol_ca_columns, conflict_column=["idol_id", "company_id"])

                # Game mode Table Seeding
                game_mode_columns = [
                    "id", "name", "description", "is_active"
                ]
                seed_table(cursor, GAME_MODES_CSV_FILE, 'gamemodes', game_mode_columns)

                # Blurry idol Table Seeding
                blurry_idols_columns = [
                    "idol_id", "blur_image_path", "is_active", "blur_image_version"
                ]
                seed_table(cursor, BLURRY_IDOLS_CSV_FILE, 'blurry_mode_data', blurry_idols_columns, conflict_column=["idol_id"])

                # Commit changes
                print("Seeding completed successfully.")
                connect.commit()

            except Exception as e:
                connect.rollback()
                print(f"Error during seeding: {e}")
                raise e

if __name__ == "__main__":
    try:
        run_seed()
    finally:
        from services.get_db import pool
        pool.close()
