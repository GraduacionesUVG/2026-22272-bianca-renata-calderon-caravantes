-- Los nombres de usuario son únicos sin distinguir mayúsculas: "bianca",
-- "Bianca" y "BIANCA" no pueden coexistir. Se conserva cómo lo escribió cada
-- persona; solo cambia la comparación.
--
-- Si ya hay nombres que solo difieren en mayúsculas, la migración se detiene
-- y los lista. Renombra uno de cada grupo (el inicio de sesión es por correo,
-- así que no afecta su acceso) y vuelve a ejecutarla:
--   UPDATE users SET username = 'nuevo_nombre' WHERE email = 'correo@...';

DO $$
DECLARE
    duplicates TEXT;
BEGIN
    SELECT string_agg(names, '; ')
    INTO duplicates
    FROM (
        SELECT string_agg(username || ' <' || email || '>', ', ') AS names
        FROM users
        GROUP BY lower(username)
        HAVING COUNT(*) > 1
    ) groups;

    IF duplicates IS NOT NULL THEN
        RAISE EXCEPTION 'Nombres de usuario que solo difieren en mayúsculas: %', duplicates;
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key
    ON users (lower(username));
