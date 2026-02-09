# Seed the database with csv data
import csv 
import sqlite3
import os
from dotenv import load_dotenv
from services.get_db import get_db

load_dotenv()
DB_FILE = os.getenv("DB_FILE")
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

def seed_table(cursor, csv_file, table_name, columns, conflict_column=["id"]):
    """Read data from a CSV file and insert it into a database table."""
    stats = {"inserted": 0, "updated": 0, "skipped": 0}

    with open(csv_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        # Placeholders for SQL query (e.g. "?, ?, ?  for 3 columns)
        placeholders = ", ".join(["?" for _ in columns])

        update_cols = [col for col in columns if col not in conflict_column]
        update_set = ", ".join([f"{col} = excluded.{col}" for col in update_cols])

        where_condition = " OR ".join([f"{table_name}.{col} IS NOT excluded.{col}" for col in update_cols])

        # SQL Insert command (Pattern)
        insert_sql = f"""
            INSERT INTO {table_name} ({', '.join(columns)}) 
            VALUES ({placeholders})
            ON CONFLICT({", ".join(conflict_column)})
            DO UPDATE SET {update_set}
            WHERE {where_condition}                
        """

        # Insert each row in database - List appending
        for row in reader:
            main_id = row[conflict_column[0]]
            cursor.execute(f"SELECT 1 FROM {table_name} WHERE {conflict_column[0]} = ?", (main_id,))
            exists = cursor.fetchone()

            values = [row[column] for column in columns]
            cursor.execute(insert_sql, values)

            if cursor.rowcount > 0:
                if not exists:
                    stats["inserted"] += 1
                else:
                    stats["updated"] += 1
            else:
                stats["skipped"] += 1

        print(f"Seeded {table_name}: {stats['inserted']} inserted, {stats['updated']} updated, {stats['skipped']} skipped.")


def run_seed():
    connect = sqlite3.connect(DB_FILE)
    connect.execute("PRAGMA foreign_keys=OFF;")
    connect.execute("PRAGMA journal_mode=WAL;")
    connect.execute("PRAGMA synchronous=NORMAL;")
    cursor = connect.cursor()

    try:
        # Idols Table Seeding
        idols_columns = [
            "id", "artist_name", "real_name", "gender", "debut_year", "nationality", 
            "birth_date", "height", "position", "image_path", "is_published", "release_date"
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
            "idol_id", "blur_image_path", "is_active"
        ]
        seed_table(cursor, BLURRY_IDOLS_CSV_FILE, 'blurry_mode_data', blurry_idols_columns, conflict_column=["idol_id"])

        # Commit changes
        print("Seeding completed successfully.")
        connect.commit()

    except Exception as e:
        print(f"Error during seeding: {e}")
        connect.rollback()
        print(f"Rolled back changes due to error.")

    finally:
        connect.execute("PRAGMA foreign_keys=ON;")
        # Close connection
        connect.close()

if __name__ == "__main__":
    run_seed()
