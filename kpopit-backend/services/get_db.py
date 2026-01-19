
import sqlite3
from flask import g
import os
from dotenv import load_dotenv
from repositories.idol_repository import IdolRepository

load_dotenv()

DB_FILE = os.getenv('DB_FILE')

def get_db():
    """Get a database connection"""
    if 'db' not in g:
        g.db = sqlite3.connect(DB_FILE)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys=ON;') # Enable foreign key support
        g.db.execute('PRAGMA journal_mode=WAL;') # Enable WAL mode
        g.db.execute('PRAGMA synchronous=NORMAL;') # Set synchronous to NORMAL for better performance

    return g.db

def get_idol_repo():
    if 'idol_repo' not in g:
        cursor = get_db().cursor()
        g.idol_repo = IdolRepository(cursor)
    return g.idol_repo

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_app(app):
    app.teardown_appcontext(close_db)
