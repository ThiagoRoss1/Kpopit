-- Least-privilege roles, idempotent. Run as the owner with psql (it uses \gexec and \if):
--   psql "<owner URL>" -v ON_ERROR_STOP=1 -v app_password=... -v backup_password=... -f scripts/db_roles.sql
-- kpopit_app: table DML + sequence use, no DDL. kpopit_backup: read-only for pg_dump.
-- Default privileges cover tables the owner creates later; migrations keep running as the owner.

\if :{?app_password}
\else
  \echo 'Missing -v app_password=...'
  \quit
\endif
\if :{?backup_password}
\else
  \echo 'Missing -v backup_password=...'
  \quit
\endif

BEGIN;

-- Roles (created once; the password is set on every run so it can be rotated by re-running).
SELECT 'CREATE ROLE kpopit_app LOGIN'
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kpopit_app') \gexec
SELECT 'CREATE ROLE kpopit_backup LOGIN'
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kpopit_backup') \gexec

ALTER ROLE kpopit_app    WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'app_password';
ALTER ROLE kpopit_backup WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD :'backup_password';

-- Nobody but the owner creates objects in public (already the default on PostgreSQL 15+).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- kpopit_app -------------------------------------------------------------------
SELECT format('GRANT CONNECT ON DATABASE %I TO kpopit_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO kpopit_app;
REVOKE CREATE ON SCHEMA public FROM kpopit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kpopit_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kpopit_app;

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kpopit_app', current_user) \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kpopit_app', current_user) \gexec

-- kpopit_backup ----------------------------------------------------------------
SELECT format('GRANT CONNECT ON DATABASE %I TO kpopit_backup', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO kpopit_backup;
REVOKE CREATE ON SCHEMA public FROM kpopit_backup;

SELECT current_setting('server_version_num')::int >= 140000 AS has_read_all_data \gset
\if :has_read_all_data
  GRANT pg_read_all_data TO kpopit_backup;
\else
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO kpopit_backup;
  GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO kpopit_backup;
  SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO kpopit_backup', current_user) \gexec
  SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON SEQUENCES TO kpopit_backup', current_user) \gexec
\endif

COMMIT;

-- Check (read-only): what each role can do on every table.
SELECT r.rolname,
       count(*) FILTER (WHERE has_table_privilege(r.rolname, c.oid, 'SELECT')) AS can_select,
       count(*) FILTER (WHERE has_table_privilege(r.rolname, c.oid, 'INSERT')) AS can_insert,
       count(*) FILTER (WHERE has_table_privilege(r.rolname, c.oid, 'TRUNCATE')) AS can_truncate,
       count(*) AS tables,
       has_schema_privilege(r.rolname, 'public', 'CREATE') AS can_create_in_public
  FROM pg_roles r
 CROSS JOIN pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
 WHERE r.rolname IN ('kpopit_app', 'kpopit_backup') AND c.relkind IN ('r', 'p')
 GROUP BY r.rolname
 ORDER BY r.rolname;
