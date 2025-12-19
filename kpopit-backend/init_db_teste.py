# Seed the database with csv data
import csv 
import sqlite3
import os
from dotenv import load_dotenv

# Database file
load_dotenv()
DB_FILE = os.getenv("DB_FILE")
DATA_FOLDER = os.getenv("DATA_FOLDER")


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
    birth_date TEXT,
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pick_date DATE NOT NULL UNIQUE,
    idol_id INTEGER NOT NULL,

    /* --- Foreign Key --- */
    FOREIGN KEY(idol_id) REFERENCES idols(id)
    );
"""

# Execute the SQL command to create the table
cursor.execute(daily_picks_sql)