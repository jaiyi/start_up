-- Create or update the runtime login role for the Family Nutrition MCP service.
-- Run this with psql variables supplied from the server-only .env file:
--   -v app_user="$FAMILY_NUTRITION_POSTGRES_APP_USER"
--   -v app_password="$FAMILY_NUTRITION_POSTGRES_APP_PASSWORD"
--   -v app_family_ids="$FAMILY_NUTRITION_ALLOWED_FAMILY_IDS"
-- Do not hardcode real passwords in this file.

\set ON_ERROR_STOP on

SELECT :'app_user' AS app_user_value \gset
SELECT :'app_password' AS app_password_value \gset
SELECT :'app_family_ids' AS app_family_ids_value \gset
SELECT quote_ident(:'app_user_value') AS app_user_sql \gset
SELECT quote_literal(:'app_password_value') AS app_password_sql \gset
SELECT quote_literal(:'app_user_value') AS app_user_literal_sql \gset
SELECT CASE WHEN to_regclass('family_state.runtime_family_access') IS NULL THEN 'false' ELSE 'true' END AS runtime_family_access_exists \gset

SELECT CASE
  WHEN length(trim(:'app_user_value')) = 0 THEN 'SELECT 1 / 0 /* app_user psql variable is required */'
  WHEN length(trim(:'app_password_value')) = 0 THEN 'SELECT 1 / 0 /* app_password psql variable is required */'
  WHEN length(trim(:'app_family_ids_value')) = 0 THEN 'SELECT 1 / 0 /* app_family_ids psql variable is required */'
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user_value')
    THEN format(
      'ALTER ROLE %s WITH LOGIN PASSWORD %s NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
      :'app_user_sql',
      :'app_password_sql'
    )
  ELSE format(
      'CREATE ROLE %s WITH LOGIN PASSWORD %s NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
      :'app_user_sql',
      :'app_password_sql'
    )
END \gexec

SELECT format('GRANT family_nutrition_runtime TO %s', :'app_user_sql') \gexec

\if :runtime_family_access_exists
SELECT format(
  'DELETE FROM family_state.runtime_family_access WHERE role_name = %s::name',
  :'app_user_literal_sql'
) \gexec

WITH parsed_family_ids AS (
  SELECT DISTINCT trim(value)::uuid AS family_id
  FROM regexp_split_to_table(:'app_family_ids_value', ',') AS value
  WHERE length(trim(value)) > 0
)
SELECT format(
  'INSERT INTO family_state.runtime_family_access (role_name, family_id) VALUES %s',
  string_agg(format('(%s::name, %L::uuid)', :'app_user_literal_sql', parsed_family_ids.family_id), ', ')
)
FROM parsed_family_ids
HAVING count(*) > 0
\gexec
\else
SELECT 1 AS runtime_family_access_pending;
\endif
