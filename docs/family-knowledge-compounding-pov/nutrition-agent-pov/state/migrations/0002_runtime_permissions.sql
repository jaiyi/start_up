-- Milestone 2 runtime permissions for the Family Nutrition MCP service.
-- This migration is secret-free and creates only the no-login runtime group role.
-- The login app role is created by infra/postgres/create-runtime-app-role.sql with server-only variables.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'family_nutrition_runtime') THEN
    CREATE ROLE family_nutrition_runtime NOLOGIN;
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA family_state FROM PUBLIC;

CREATE OR REPLACE FUNCTION family_state.check_runtime_health(required_tables text[])
RETURNS TABLE(schema_exists boolean, existing_table_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, information_schema
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.schemata
      WHERE schema_name = 'family_state'
    ) AS schema_exists,
    COUNT(*) AS existing_table_count
  FROM information_schema.tables
  WHERE table_schema = 'family_state'
    AND table_name = ANY(required_tables)
$$;

REVOKE ALL ON FUNCTION family_state.check_runtime_health(text[]) FROM PUBLIC;
GRANT USAGE ON SCHEMA family_state TO family_nutrition_runtime;
GRANT EXECUTE ON FUNCTION family_state.check_runtime_health(text[]) TO family_nutrition_runtime;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA family_state FROM family_nutrition_runtime;
REVOKE SELECT ON ALL TABLES IN SCHEMA family_state FROM family_nutrition_runtime;
