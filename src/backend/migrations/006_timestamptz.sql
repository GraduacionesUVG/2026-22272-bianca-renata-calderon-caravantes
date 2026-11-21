-- Convierte todas las columnas TIMESTAMP (sin zona horaria) a TIMESTAMPTZ.
--
-- Hasta ahora las fechas se guardaban como hora local sin zona, y la API las
-- enviaba como si fueran UTC ("...Z"), así que la app las mostraba 6 horas
-- antes. Con TIMESTAMPTZ cada valor es un instante exacto y la API envía el
-- desfase correcto.
--
-- Los valores existentes se interpretan en la zona horaria de la sesión, que
-- es la misma con la que se escribieron (CURRENT_TIMESTAMP del servidor y
-- time.Now() del backend en la misma máquina). Ejecuta esta migración con la
-- zona de la app, por ejemplo:
--   PGTZ=America/Guatemala psql "$DATABASE_URL" -f 006_timestamptz.sql
--
-- Es idempotente: solo toca columnas que aún sean TIMESTAMP sin zona.

DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type = 'timestamp without time zone'
        ORDER BY table_name, column_name
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE current_setting(''TimeZone'')',
            col.table_name,
            col.column_name,
            col.column_name
        );
    END LOOP;
END
$$;
