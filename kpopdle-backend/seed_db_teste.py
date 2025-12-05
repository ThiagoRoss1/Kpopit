# Seed the database with csv data
import csv 
import sqlite3
import os

DB_FILE = "kpopdle-teste.db"
DATA_FOLDER = "data"

connect = sqlite3.connect(DB_FILE)
cursor = connect.cursor()

# CSV files
IDOLS_CSV_FILE = os.path.join(DATA_FOLDER, "idols.csv")
GROUPS_CSV_FILE = os.path.join(DATA_FOLDER, "groups.csv")
IDOL_CAREER_CSV_FILE = os.path.join(DATA_FOLDER, "idol_career.csv")
COMPANIES_CSV_FILE = os.path.join(DATA_FOLDER, "companies.csv")
GROUP_CA_CSV_FILE = os.path.join(DATA_FOLDER, "group_company_affiliation.csv")
IDOL_CA_CSV_FILE = os.path.join(DATA_FOLDER, "idol_company_affiliation.csv")

def seed_table(cursor, csv_file, table_name, columns):
    """Read data from a CSV file and insert it into a database table."""
    with open(csv_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        # Placeholders for SQL query (e.g. "?, ?, ?  for 3 columns)
        placeholders = ", ".join(["?" for _ in columns])

        # SQL Insert command (Pattern)
        insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

        # Insert each row in database - List appending
        for row in reader:
            values = [row[column] for column in columns]
            cursor.execute(insert_sql, values)


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
seed_table(cursor, IDOL_CAREER_CSV_FILE, 'idol_career', idol_career_columns)

# Group Company Affiliation Table Seeding
group_ca_columns = [
    "group_id", "company_id", "role"
]
seed_table(cursor, GROUP_CA_CSV_FILE, 'group_company_affiliation', group_ca_columns)

# Idol Company Affiliation Table Seeding
idol_ca_columns = [
    "idol_id", "company_id", "role"
]
seed_table(cursor, IDOL_CA_CSV_FILE, 'idol_company_affiliation', idol_ca_columns)


# Commit changes
connect.commit()
# Close connection
connect.close()
