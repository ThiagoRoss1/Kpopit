# Seed the database with csv data
import csv 
import sqlite3
import os

# Database file
DB_FILE = "kpopdle.db"
DATA_FOLDER = "data"

# CSV files
IDOLS_CSV_FILE = os.path.join(DATA_FOLDER, "idols.csv")
GROUPS_CSV_FILE = os.path.join(DATA_FOLDER, "groups.csv")
IDOL_CAREER_CSV_FILE = os.path.join(DATA_FOLDER, "idol_career.csv")
COMPANIES_CSV_FILE = os.path.join(DATA_FOLDER, "companies.csv")
GROUP_CA_CSV_FILE = os.path.join(DATA_FOLDER, "group_company_affiliation.csv")
IDOL_CA_CSV_FILE = os.path.join(DATA_FOLDER, "idol_company_affiliation.csv")


connect = sqlite3.connect(DB_FILE)
cursor = connect.cursor()

idols_sql = """
    CREATE TABLE IF NOT EXISTS idols (
    /* --- Idol identifier --- */
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artist_name TEXT NOT NULL,
    real_name TEXT,
    gender TEXT NOT NULL,
    debut_year INTEGER,

    /* --- Game Data --- */
    nationality TEXT NOT NULL,
    birth_year INTEGER,
    height INTEGER,
    position TEXT,

    /* --- Visual --- */
    image_path TEXT
    );
"""
# Execute the SQL command to create the table
cursor.execute(idols_sql)

groups_sql = """
    CREATE TABLE IF NOT EXISTS groups (
    /* --- Group identifier --- */
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,

    /* --- Group Data --- */
    group_debut_year INTEGER,
    member_count INTEGER,
    generation INTEGER,

    /* --- Fandom Data --- */
    fandom_name TEXT
    );
"""

# Execute the SQL command to create the table
cursor.execute(groups_sql)

idol_career_sql = """
    CREATE TABLE IF NOT EXISTS idol_career (
    idol_id INTEGER,
    group_id INTEGER,
    is_active BOOLEAN NOT NULL,
    start_year INTEGER,
    end_year INTEGER,

    /* --- Primary Key --- */
    PRIMARY KEY(idol_id, group_id)

    /* --- Foreign Keys --- */
    FOREIGN KEY(idol_id) REFERENCES idols(id),
    FOREIGN KEY(group_id) REFERENCES groups(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(idol_career_sql)

companies_sql = """
    CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_company_id INTEGER,

    /* --- Foreign Key --- */
    FOREIGN KEY(parent_company_id) REFERENCES companies(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(companies_sql)

group_ca_sql = """
    CREATE TABLE IF NOT EXISTS group_company_affiliation (
    group_id INTEGER,
    company_id INTEGER,
    role TEXT, -- 'Label', 'Parent Company', 'Distributor'...

    /* --- Primary Key --- */
    PRIMARY KEY(group_id, company_id),

    /* --- Foreign Keys --- */    
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(group_ca_sql)

idol_ca_sql = """
    CREATE TABLE IF NOT EXISTS idol_company_affiliation (
    idol_id INTEGER,
    company_id INTEGER,
    role TEXT, -- 'Solo Management', 'Group Management'...

    /* --- Primary Key --- */
    PRIMARY KEY(idol_id, company_id),

    /* --- Foreign Keys --- */
    FOREIGN KEY(idol_id) REFERENCES idols(id),
    FOREIGN KEY(company_id) REFERENCES companies(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(idol_ca_sql)

daily_picks_sql = """
    CREATE TABLE IF NOT EXISTS daily_picks (
    pick_date DATE PRIMARY KEY,
    idol_id INTEGER NOT NULL,

    /* --- Foreign Key --- */
    FOREIGN KEY(idol_id) REFERENCES idols(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(daily_picks_sql)


def seed_table(cursor, csv_file, table_name, columns, transformer=None):
    """Read data from a CSV file and insert it into a database table."""
    with open(csv_file, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        # Placeholders for SQL query (e.g. "?, ?, ?  for 3 columns)
        placeholders = ", ".join(["?" for _ in columns])

        # SQL Insert command (Pattern)
        insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

        # Insert each row in database - List appending
        for row in reader:
            # Transform row if transformer function is provided - e.g. convert types (image_path)
            if transformer:
                row = transformer(row)

            values = [row[column] for column in columns]
            cursor.execute(insert_sql, values)

# Transform the image_path to include the idol's id as prefix
def image_path_transformer(row):
    row["image_path"] = f"/static/images/{row['id']}.{row['image_ext']}"
    """It will return the image_path with the same idol id as prefix with the 
    ext (e.g. .jpg, .png) that was given in idols.csv 'image_path' column"""
    return row

# Idols Table Seeding
idols_columns = [
    "id", "artist_name", "real_name", "gender", "debut_year", "nationality", 
    "birth_year", "height", "position", "image_path"
]
seed_table(cursor, IDOLS_CSV_FILE, 'idols', idols_columns, transformer=image_path_transformer)

# Groups Table Seeding
groups_columns = [
    "id", "name", "group_debut_year", 
    "member_count", "generation", "fandom_name"
]
seed_table(cursor, GROUPS_CSV_FILE, 'groups', groups_columns)

# Companies Table Seeding
companies_columns = [
    "id", "name", "parent_company_id"
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
