# Gymify - Diccionario de Datos

## Descripción

Gymify utiliza PostgreSQL como sistema gestor de base de datos y sigue un modelo relacional. Todas las tablas usan UUID (`gen_random_uuid()`, extensión `pgcrypto`) como identificador y `TIMESTAMPTZ` para las fechas.

Este documento describe el esquema vigente: 16 tablas. Las fechas se interpretan en la zona `APP_TIMEZONE` (por defecto `America/Guatemala`), que el backend fija en cada conexión; de ella depende cuándo empieza cada semana (lunes 00:00) para la racha.

## Creación del esquema

El esquema se reconstruye con estos archivos, en orden:

1. `backend/deploy/schema.sql`: volcado del esquema (cubre las migraciones 001–007).
2. `backend/deploy/catalogs.sql`: catálogos iniciales (logros, retos y ejercicios base).
3. `backend/migrations/008_*.sql` a `016_*.sql`, en orden numérico.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/deploy/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/deploy/catalogs.sql
for f in backend/migrations/0{08,09,10,11,12,13,14,15,16}_*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Las migraciones 008–016 son idempotentes (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), por lo que pueden volver a ejecutarse sobre una base que ya las tenga. Con `go run ./cmd/dbcheck` (desde `backend/`) se comprueba el resultado: 16 tablas, 44 ejercicios, 6 logros y 3 retos.

| Migración | Cambio |
|---|---|
| 001 | Esquema inicial |
| 002 | `password_reset_tokens` |
| 003 | `reports` |
| 004 | `follows` |
| 005 | Racha semanal: `users.weekly_goal` y `weekly_goal_history` |
| 006 | Fechas a `TIMESTAMPTZ` |
| 007 | Imágenes y licencias de ejercicios |
| 008 | 25 ejercicios adicionales |
| 009 | Ejercicios de cardio |
| 010 | `workouts.is_public` |
| 011 | Nombre de usuario único sin distinguir mayúsculas |
| 012 | Notificaciones de likes, comentarios y seguidores |
| 013 | `users.weight_kg`, `users.celebrations_enabled`, `exercises.met` |
| 014 | Ejercicios personalizados (`exercises.created_by`) y `workouts.strength_calories` |
| 015 | Índice único `idx_reports_unique_reporter_post`: un reporte por usuario y publicación |
| 016 | Índice `idx_posts_created_at_id` para paginar el feed por cursor |

## Usuarios y autenticación

### Tabla: users

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| role | VARCHAR | `user`, `coach`, `nutritionist` o `admin` (por defecto `user`) |
| username | VARCHAR | Nombre de usuario, único sin distinguir mayúsculas, mínimo 3 caracteres |
| full_name | VARCHAR | Nombre completo |
| email | VARCHAR | Correo, único |
| password_hash | TEXT | Hash bcrypt de la contraseña |
| bio | TEXT | Biografía opcional |
| profile_picture | VARCHAR | Imagen de perfil opcional |
| level | INTEGER | Nivel actual (≥ 1) |
| xp | INTEGER | Experiencia acumulada (≥ 0) |
| streak | INTEGER | Semanas consecutivas con la meta cumplida (≥ 0) |
| weekly_goal | SMALLINT | Días de entrenamiento por semana (1–7); nulo hasta que el usuario la elige |
| weight_kg | NUMERIC(5,1) | Peso opcional (25–300) para estimar calorías |
| celebrations_enabled | BOOLEAN | Muestra animaciones al desbloquear logros (por defecto verdadero) |
| created_at / updated_at | TIMESTAMPTZ | Fechas de creación y actualización |

Índices: `users_email_key`, `users_username_key` y `users_username_lower_key` (único sobre `lower(username)`).

### Tabla: password_reset_tokens

Códigos de recuperación de contraseña (HU-18).

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| user_id | UUID | Usuario (`ON DELETE CASCADE`) |
| code_hash | TEXT | HMAC del código de 6 dígitos; el código nunca se guarda en claro |
| attempts | INTEGER | Intentos fallidos (se invalida a los 5) |
| expires_at | TIMESTAMPTZ | Caducidad (15 minutos) |
| used_at | TIMESTAMPTZ | Momento de uso; nulo si sigue activo |
| created_at | TIMESTAMPTZ | Fecha de creación |

Índice único parcial `idx_password_reset_tokens_one_active (user_id) WHERE used_at IS NULL`: un solo código activo por usuario.

## Entrenamiento

### Tabla: exercises

Catálogo global y ejercicios personalizados.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| name | VARCHAR | Nombre |
| description | TEXT | Descripción opcional |
| muscle_group | VARCHAR | `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `full_body` o `cardio` |
| equipment | VARCHAR | Equipo opcional |
| difficulty | VARCHAR | `beginner`, `intermediate` o `advanced` |
| is_active | BOOLEAN | Si aparece en la lista de selección |
| met | NUMERIC(4,1) | Equivalente metabólico (> 0), solo ejercicios de cardio |
| created_by | UUID | Autor de un ejercicio personalizado; nulo en el catálogo global (`ON DELETE CASCADE`) |
| image_url, image_author, image_license, image_license_url, image_source_url | TEXT / VARCHAR | Imagen de vista previa y su atribución (wger.de, Creative Commons) |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

Índices únicos parciales: `idx_exercises_catalog_name (lower(name)) WHERE created_by IS NULL` e `idx_exercises_custom_name (created_by, lower(name)) WHERE created_by IS NOT NULL`. Un nombre no se repite en el catálogo ni entre los ejercicios de un mismo usuario.

### Tabla: workouts

Sesión de entrenamiento registrada por un usuario.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| user_id | UUID | Usuario propietario (`ON DELETE CASCADE`) |
| title | VARCHAR | Nombre de la sesión |
| workout_date | TIMESTAMPTZ | Día del entrenamiento (hasta 3 días atrás) |
| duration_minutes | INTEGER | Duración (> 0) |
| calories_burned | INTEGER | Calorías estimadas por el servidor (cardio + fuerza) |
| strength_calories | INTEGER | Parte de fuerza de `calories_burned` (0 ≤ x ≤ total) |
| completed | BOOLEAN | Indica si fue completado (por defecto verdadero) |
| is_public | BOOLEAN | Visible en el perfil para otros usuarios (por defecto falso) |
| notes | TEXT | Notas opcionales, solo visibles para el dueño |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

Índices: `idx_workouts_user`, `idx_workouts_user_date (user_id, workout_date)` para el cálculo semanal de la racha e `idx_workouts_public_by_user (user_id, workout_date DESC) WHERE is_public`.

### Tabla: workout_exercises

Ejercicios realizados en cada entrenamiento.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| workout_id | UUID | Entrenamiento (`ON DELETE CASCADE`) |
| exercise_id | UUID | Ejercicio (`ON DELETE CASCADE`) |
| sets | INTEGER | Series (> 0) |
| reps | INTEGER | Repeticiones (> 0) |
| weight | NUMERIC(5,2) | Peso opcional (≥ 0) |
| duration_seconds | INTEGER | Duración opcional (cardio) |
| order_number | INTEGER | Orden dentro del entrenamiento (> 0, único por entrenamiento) |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

## Gamificación

### Tabla: weekly_goal_history

Historial de la meta semanal, para evaluar cada semana pasada con la meta que estaba vigente.

| Campo | Tipo | Descripción |
|---|---|---|
| user_id | UUID | Usuario (`ON DELETE CASCADE`) |
| week_start | DATE | Lunes desde el que rige la meta |
| goal | SMALLINT | Meta (1–7) |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

Clave primaria `(user_id, week_start)`; un `CHECK` exige que `week_start` sea lunes.

### Tabla: achievements

Catálogo de logros (6 en `catalogs.sql`).

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| title | VARCHAR | Nombre, único |
| description | TEXT | Descripción opcional |
| xp_reward | INTEGER | XP otorgado (≥ 0) |
| icon | VARCHAR | Ícono opcional |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

### Tabla: user_achievements

| Campo | Tipo | Descripción |
|---|---|---|
| user_id | UUID | Usuario (`ON DELETE CASCADE`) |
| achievement_id | UUID | Logro (`ON DELETE CASCADE`) |
| unlocked_at | TIMESTAMPTZ | Fecha de desbloqueo |

Clave primaria `(user_id, achievement_id)`: cada logro se desbloquea una sola vez.

### Tabla: challenges

Retos grupales (3 en `catalogs.sql`).

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| title | VARCHAR | Nombre, único |
| description | TEXT | Descripción opcional |
| goal | INTEGER | Entrenamientos necesarios (> 0) |
| start_date / end_date | TIMESTAMPTZ | Período del reto (`start_date < end_date`) |
| xp_reward | INTEGER | XP de recompensa (≥ 0) |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

### Tabla: challenges_participants

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| challenge_id | UUID | Reto (`ON DELETE CASCADE`) |
| user_id | UUID | Usuario (`ON DELETE CASCADE`) |
| joined_at | TIMESTAMPTZ | Fecha de incorporación |
| progress | INTEGER | Entrenamientos contados (≥ 0) |
| completed | BOOLEAN | Si alcanzó la meta |

Restricción única `(challenge_id, user_id)`.

## Comunidad

### Tabla: follows

| Campo | Tipo | Descripción |
|---|---|---|
| follower_id | UUID | Quien sigue (`ON DELETE CASCADE`) |
| followed_id | UUID | Quien es seguido (`ON DELETE CASCADE`) |
| created_at | TIMESTAMPTZ | Fecha |

Clave primaria `(follower_id, followed_id)`; un `CHECK` impide seguirse a uno mismo. Índice `idx_follows_followed` para listar seguidores.

### Tabla: posts

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| user_id | UUID | Autor (`ON DELETE CASCADE`) |
| content | TEXT | Contenido (no vacío) |
| post_type | VARCHAR | `training`, `question`, `achievement` o `general` |
| achievement_id | UUID | Logro compartido opcional (`ON DELETE SET NULL`) |
| edited | BOOLEAN | Indica si fue editada |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

Índice único parcial `unique_shared_achievement (user_id, achievement_id) WHERE achievement_id IS NOT NULL`: un logro se comparte una sola vez. Índice `idx_posts_created` para el orden del feed.

### Tabla: comments

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| post_id | UUID | Publicación (`ON DELETE CASCADE`) |
| user_id | UUID | Autor (`ON DELETE CASCADE`) |
| content | TEXT | Comentario (no vacío; máximo 500 caracteres validado en el backend) |
| edited | BOOLEAN | Indica si fue editado |
| created_at | TIMESTAMPTZ | Fecha |

### Tabla: likes

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| post_id | UUID | Publicación (`ON DELETE CASCADE`) |
| user_id | UUID | Usuario (`ON DELETE CASCADE`) |
| created_at | TIMESTAMPTZ | Fecha |

Restricción única `(post_id, user_id)`: un like por usuario y publicación.

### Tabla: notifications

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| user_id | UUID | Destinatario (`ON DELETE CASCADE`) |
| type | VARCHAR | `like`, `comment` o `follow` |
| actor_id | UUID | Usuario que originó la notificación (`ON DELETE CASCADE`) |
| post_id | UUID | Publicación (obligatoria en `like` y `comment`, nula en `follow`) |
| comment_id | UUID | Comentario (obligatorio en `comment`) |
| title / message | VARCHAR / TEXT | Columnas heredadas del esquema inicial; ahora opcionales |
| is_read | BOOLEAN | Estado de lectura |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

El `CHECK chk_notification_target` exige la combinación correcta de `post_id` y `comment_id` según el tipo. Los índices únicos parciales `uq_notifications_like (actor_id, post_id)` y `uq_notifications_follow (actor_id, user_id)` evitan duplicados al dar y quitar like o seguir varias veces. `idx_notifications_unread` acelera el contador de no leídas.

### Tabla: reports

Reportes de publicaciones y su revisión por moderadores.

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| post_id | UUID | Publicación reportada (`ON DELETE CASCADE`) |
| reporter_id | UUID | Quien reporta (`ON DELETE CASCADE`) |
| reporter_name | VARCHAR | Nombre del reportante al momento del reporte |
| report_type | VARCHAR | `inappropriate_content`, `harassment`, `spam`, `misinformation` u `other` |
| report_status | VARCHAR | `pending`, `reviewed`, `resolved` o `dismissed` (por defecto `pending`) |
| description | VARCHAR | Motivo (1–500 caracteres) |
| moderator_notes | TEXT | Notas del moderador |
| reviewed_by_id | UUID | Moderador (`ON DELETE SET NULL`) |
| reviewed_at | TIMESTAMPTZ | Fecha de revisión |
| created_at / updated_at | TIMESTAMPTZ | Fechas |

Índices por publicación, reportante, estado e `idx_reports_pending_created` (parcial sobre `pending`) para la cola de moderación.

## Relaciones principales

- Un usuario registra múltiples entrenamientos; cada entrenamiento contiene múltiples ejercicios.
- Un usuario puede crear ejercicios personalizados, visibles solo para él.
- Un usuario tiene una meta semanal y su historial de cambios.
- Un usuario desbloquea múltiples logros y participa en múltiples retos.
- Un usuario sigue a otros usuarios y es seguido por ellos.
- Un usuario crea publicaciones; una publicación puede estar asociada a un logro y recibe likes, comentarios y reportes.
- Un usuario recibe notificaciones por likes, comentarios y nuevos seguidores.

Eliminar un usuario elimina en cascada todo su contenido; eliminar una publicación elimina sus likes, comentarios, reportes y notificaciones.

## Observaciones

- La carpeta `database/` de la raíz contiene archivos de las primeras etapas del proyecto y ya no representa el esquema vigente; la fuente de verdad son `backend/deploy/` y `backend/migrations/`.
- `schema.sql` es un volcado de `pg_dump`; las migraciones 001–007 se conservan como historial y no hace falta ejecutarlas sobre él.
