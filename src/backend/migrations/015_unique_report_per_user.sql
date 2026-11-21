-- Un usuario solo puede reportar una vez cada publicación. ReportService ya
-- lo comprueba, pero dos solicitudes simultáneas podrían pasar esa
-- comprobación a la vez; el índice único lo garantiza en la base.
-- Idempotente. Va en una transacción: si hay duplicados históricos, falla
-- sin cambiar nada y no borra reportes por su cuenta.
--
-- Para ver los duplicados antes de aplicarla:
--   SELECT post_id, reporter_id, COUNT(*)
--   FROM reports
--   GROUP BY post_id, reporter_id
--   HAVING COUNT(*) > 1;

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM reports
        GROUP BY post_id, reporter_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Hay reportes duplicados (mismo usuario y publicación). Revísalos con la consulta del encabezado antes de aplicar esta migración.';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_reporter_post
    ON reports (post_id, reporter_id);

COMMIT;
