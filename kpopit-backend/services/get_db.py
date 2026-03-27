
import atexit
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from flask import g
import os
from dotenv import load_dotenv
import logging
from repositories.idol_repository import IdolRepository
from contextlib import contextmanager

load_dotenv()

DB_URL = os.getenv('DB_URL')
if not DB_URL:
    raise RuntimeError("DB_URL not set in environment variables.")

pool = ConnectionPool(
    conninfo=DB_URL,
    min_size=1,
    max_size=5,
    timeout=5.0,
    max_lifetime=300,
    max_idle=120,
    max_waiting=10,
    check=ConnectionPool.check_connection,
    kwargs={
        'row_factory': dict_row,
        'options': (
            '-c timezone=America/New_York '
            '-c statement_timeout=30000 '
            '-c lock_timeout=5000 '
            '-c idle_in_transaction_session_timeout=20000'
        )
    }
)

logger = logging.getLogger(__name__)

def get_db():
    """Get a database connection"""
    if 'db' not in g:
        g.db = pool.getconn()
        # g.db.row_factory = dict_row // see after because i configured kwargs in pool to use dict_row by default

    return g.db

@contextmanager
def get_manual_db():
    """Get a database connection - Alternative function for non Flask use cases -> (Seeding script....)"""
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)

def get_idol_repo():
    if 'idol_repo' not in g:
        conn = get_db()
        g.idol_cursor = conn.cursor()
        g.idol_repo = IdolRepository(g.idol_cursor)
    return g.idol_repo

def close_db(_=None):
    cursor = g.pop('idol_cursor', None)
    if cursor is not None:
        cursor.close()

    db = g.pop('db', None)
    if db is not None:
        try:
            if not db.closed:
                db.rollback()

        except Exception:
            logger.exception("Error rolling back database transaction")
        
        finally:
            pool.putconn(db)

def init_app(app):
    app.teardown_appcontext(close_db)
    atexit.register(pool.close)
