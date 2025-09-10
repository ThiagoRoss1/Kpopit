# Seed the database with csv data

import csv 
import sqlite3

DB_FILE = "kpopdle.db"
CSV_FILE = "idols.csv"

connect = sqlite3.connect(DB_FILE)
cursor = connect.cursor()

## Create table .....

#.....



with open(CSV_FILE, "r", encoding="utf-8") as file:
    reader = csv.DictReader(file)

    #for row in reader:

        #nome 1
        #grupo 2 

        # cursor.execute(insert.......)

# connect.commit()

# connect.close()