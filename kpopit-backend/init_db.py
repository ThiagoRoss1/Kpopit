# Seed the database with csv data
import csv 
import psycopg
import os
from dotenv import load_dotenv

# Database file
load_dotenv()
DB_URL = os.getenv("DB_URL")
DATA_FOLDER = os.getenv("DATA_FOLDER")

def init_db():
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cursor:

                # --- IDOLS TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS idols (
                    /* --- Idol identifier --- */
                    id SERIAL PRIMARY KEY NOT NULL,
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
                """)

                # --- GROUPS TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS groups (
                    /* --- Group identifier --- */
                    id SERIAL PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL UNIQUE,

                    /* --- Group Data --- */
                    group_debut_year INTEGER,
                    member_count INTEGER,
                    generation INTEGER,

                    /* --- Fandom Data --- */
                    fandom_name TEXT
                    );
                """)

                # --- IDOL CAREER TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS idol_career (
                    idol_id INTEGER,
                    group_id INTEGER,
                    is_active BOOLEAN NOT NULL,
                    start_year INTEGER,
                    end_year INTEGER,

                    /* --- Primary Key --- */
                    PRIMARY KEY(idol_id, group_id),

                    /* --- Foreign Keys --- */
                    FOREIGN KEY(idol_id) REFERENCES idols(id),
                    FOREIGN KEY(group_id) REFERENCES groups(id)
                    );
                """)

                # --- COMPANIES TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL UNIQUE,
                    parent_company_id INTEGER,

                    /* --- Foreign Key --- */
                    FOREIGN KEY(parent_company_id) REFERENCES companies(id)
                    );
                """)

                # --- GROUP-COMPANY AFFILIATION TABLE ---
                cursor.execute("""
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
                """)

                # --- IDOL-COMPANY AFFILIATION TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS idol_company_affiliation (
                    id SERIAL PRIMARY KEY,
                    idol_id INTEGER NOT NULL,
                    company_id INTEGER,
                    role TEXT, -- 'Solo Management', 'Group Management'...
                               
                    /* --- Foreign Keys --- */
                    FOREIGN KEY(idol_id) REFERENCES idols(id),
                    FOREIGN KEY(company_id) REFERENCES companies(id),
                                      
                    /* --- Unique Constraint --- */
                    CONSTRAINT fk_unique_idol_company_pair UNIQUE (idol_id, company_id)
                    );
                """)

                # --- DAILY PICKS TABLE ---
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS daily_picks (
                    id SERIAL PRIMARY KEY NOT NULL,
                    pick_date DATE NOT NULL UNIQUE,
                    idol_id INTEGER NOT NULL,

                    /* --- Foreign Key --- */
                    FOREIGN KEY(idol_id) REFERENCES idols(id)
                    );
                """)

                # --- YESTERDAY PICKS TABLE ---
                cursor.execute("""
                        CREATE TABLE IF NOT EXISTS yesterday_picks (
                        past_idol_id INTEGER NOT NULL,
                        yesterdays_pick_date DATE PRIMARY KEY,

                        /* --- Foreign Key --- */
                        FOREIGN KEY(past_idol_id) REFERENCES idols(id)
                        );
                    """)

    except Exception as e:
        print(f"Error connecting to database: {e}")
        exit(1)

if __name__ == "__main__":
    init_db()