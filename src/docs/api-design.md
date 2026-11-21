# Gymify - API REST

## Descripción

Gymify utiliza una API REST desarrollada en Go (enrutador chi) para la comunicación entre el frontend en React Native/Expo y la base de datos PostgreSQL.

La API intercambia información mediante JSON. Las rutas protegidas utilizan autenticación mediante JWT.

Este documento refleja las rutas registradas en `backend/internal/routes/routes.go`.

## Base URL

Todas las rutas de este documento cuelgan de `/api/v1`, salvo `GET /health`, que está en la raíz del servidor.

- Local: `http://localhost:8080/api/v1`
- Producción: la URL del servicio en Render + `/api/v1` (el frontend la recibe en `EXPO_PUBLIC_API_URL`).

## Convenciones

### Autenticación

Las rutas protegidas requieren el encabezado `Authorization: Bearer <token>`. Sin él, o con un token inválido o expirado, la API responde `401`.

El token es un JWT firmado con HS256 (`JWT_SECRET`) cuyo `sub` es el ID del usuario.

### Sesión deslizante

- El token dura **30 días** desde su emisión.
- Cuando una petición autenticada llega con un token emitido hace **más de 24 horas**, la respuesta incluye un token nuevo en el encabezado `X-Refreshed-Token`.
- El cliente reemplaza su token por el renovado, de modo que la sesión solo expira tras 30 días sin usar la app.
- El encabezado está expuesto por CORS (`ExposedHeaders`) para que el navegador permita leerlo.

### Errores

Los errores se devuelven como JSON con la forma:

```json
{ "error": "mensaje legible en español" }
```

Las respuestas exitosas de creación o acción incluyen normalmente un campo `message` junto al recurso afectado.

### CORS

Solo los orígenes de `CORS_ALLOWED_ORIGINS` pueden llamar a la API desde un navegador. Por defecto: `https://gymify-frontend.netlify.app` y `http://localhost:8081` (Expo Web).

## Resumen de rutas

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | No | Estado del servicio |
| POST | `/auth/register` | No | Registro de usuario |
| POST | `/auth/login` | No | Inicio de sesión |
| POST | `/auth/forgot-password` | No | Solicitar código de recuperación |
| POST | `/auth/reset-password` | No | Establecer nueva contraseña |
| GET | `/users/profile` | Sí | Perfil propio |
| PUT | `/users/profile` | Sí | Editar perfil |
| PATCH | `/users/settings` | Sí | Peso y celebraciones |
| GET | `/users/achievements` | Sí | Logros desbloqueados |
| POST | `/users/achievements/{achievementID}/share` | Sí | Compartir logro en el feed |
| GET | `/users/streak` | Sí | Estado de la racha semanal |
| PUT | `/users/weekly-goal` | Sí | Elegir meta semanal |
| GET | `/users/stats` | Sí | Estadísticas de entrenamiento |
| GET | `/users/search?q=` | Sí | Buscar usuarios |
| GET | `/users/{userID}` | Sí | Perfil público |
| POST | `/users/{userID}/follow` | Sí | Seguir |
| DELETE | `/users/{userID}/follow` | Sí | Dejar de seguir |
| GET | `/users/{userID}/followers` | Sí | Seguidores |
| GET | `/users/{userID}/following` | Sí | Seguidos |
| GET | `/users/{userID}/workouts` | Sí | Entrenamientos visibles de un perfil |
| POST | `/workouts` | Sí | Registrar entrenamiento |
| GET | `/workouts` | Sí | Historial propio |
| GET | `/workouts/{workoutID}` | Sí | Detalle de entrenamiento |
| PATCH | `/workouts/{workoutID}` | Sí | Renombrar |
| PATCH | `/workouts/{workoutID}/visibility` | Sí | Público / privado |
| GET | `/exercises` | Sí | Catálogo + ejercicios propios |
| POST | `/exercises` | Sí | Crear ejercicio personalizado |
| DELETE | `/exercises/{exerciseID}` | Sí | Quitar ejercicio propio |
| GET | `/posts` | Sí | Feed social |
| POST | `/posts` | Sí | Crear publicación |
| DELETE | `/posts/{postID}` | Sí | Eliminar publicación propia |
| POST | `/posts/{postID}/likes` | Sí | Dar like |
| DELETE | `/posts/{postID}/likes` | Sí | Quitar like |
| GET | `/posts/{postID}/comments` | Sí | Listar comentarios |
| POST | `/posts/{postID}/comments` | Sí | Comentar |
| DELETE | `/posts/{postID}/comments/{commentID}` | Sí | Eliminar comentario propio |
| GET | `/notifications` | Sí | Últimas notificaciones |
| GET | `/notifications/unread-count` | Sí | Número de no leídas |
| POST | `/notifications/read-all` | Sí | Marcar todas como leídas |
| GET | `/challenges` | Sí | Retos y progreso propio |
| POST | `/challenges/{challengeID}/join` | Sí | Unirse a un reto |
| GET | `/rankings` | Sí | Clasificación por XP |
| POST | `/reports` | Sí | Reportar publicación |
| GET | `/reports/pending` | Admin | Reportes pendientes |
| PUT | `/reports/{reportID}` | Admin | Revisar reporte |

## Salud

### GET /health

**Autenticación:** No requerida.

Responde `200` con `{ "status": "ok", "service": "gymify-backend" }`. El frontend lo llama al abrirse para despertar el backend de Render (el plan gratuito se suspende sin uso) y muestra un aviso de espera si tarda.

## Autenticación

### POST /auth/register

**Autenticación:** No requerida.

Cuerpo: `{ "username", "full_name", "email", "password" }`.

Responde `201` con `{ "message", "user" }`. Responde `409` si el nombre de usuario (sin distinguir mayúsculas) o el correo ya existen, y `400` si falta algún campo o no es válido. La contraseña se almacena con bcrypt.

### POST /auth/login

**Autenticación:** No requerida.

Cuerpo: `{ "email", "password" }`.

Responde `200` con `{ "message", "token", "user" }`, o `401` si las credenciales no son válidas.

### POST /auth/forgot-password

**Autenticación:** No requerida.
**Límite:** 5 solicitudes por minuto por IP.

Inicia la recuperación de contraseña (HU-18). Cuerpo: `{ "email": "..." }`.

Si el correo pertenece a una cuenta, se envía un código de 6 dígitos que caduca a los 15 minutos y solo puede usarse una vez. Solicitar un código nuevo invalida el anterior. La respuesta es siempre la misma, exista o no la cuenta, para no revelar qué correos están registrados.

Por cuenta se permite un código cada 60 segundos y un máximo de 5 por hora. Las solicitudes que superan ese límite reciben la misma respuesta, pero no generan un correo nuevo.

### POST /auth/reset-password

**Autenticación:** No requerida.
**Límite:** 10 solicitudes por minuto por IP.

Establece una nueva contraseña con el código recibido. Cuerpo: `{ "email": "...", "code": "123456", "new_password": "..." }`.

La nueva contraseña debe tener al menos 8 caracteres. Tras 5 intentos fallidos el código queda invalidado. El código se consume y la contraseña se actualiza en una misma transacción, de modo que solicitudes simultáneas con el mismo código solo pueden completar el cambio una vez.

### Recuperación desactivada

Con `PASSWORD_RESET_ENABLED=false` (por ejemplo, en un hosting que bloquea SMTP), `forgot-password` y `reset-password` responden `503` sin generar códigos ni enviar correos.

## Usuarios

### GET /users/profile

Devuelve el usuario autenticado: datos personales, `role`, `level`, `xp`, `streak`, `weekly_goal`, `weight_kg` y `celebrations_enabled`.

### PUT /users/profile

Cuerpo: `{ "username", "full_name", "bio", "profile_picture" }`. Responde `{ "message", "user" }`; `409` si el nombre de usuario ya está en uso.

### PATCH /users/settings

Cuerpo: `{ "weight_kg"?, "celebrations_enabled"? }`. Solo modifica los campos enviados. El peso (25–300 kg) se usa para estimar calorías; `celebrations_enabled` activa o desactiva las animaciones de logro.

### GET /users/achievements

Logros desbloqueados por el usuario, con `unlocked_at`.

### POST /users/achievements/{achievementID}/share

Publica el logro en el feed como publicación de tipo `achievement`. Cada logro solo puede compartirse una vez por usuario. Responde `201` con `{ "message", "post" }`.

### GET /users/streak

Estado de la racha semanal:

| Campo | Descripción |
|---|---|
| `weekly_goal` | Días por semana elegidos (1–7), o `null` si aún no se eligió |
| `weeks` | Semanas consecutivas con la meta cumplida (incluye la actual si ya se cumplió) |
| `week_start` | Lunes de la semana actual (zona `APP_TIMEZONE`) |
| `current_week_days` | Días distintos entrenados esta semana |
| `current_week_completed` | Si la meta de esta semana ya se cumplió |
| `remaining_days` | Días que faltan para cumplir la meta |

### PUT /users/weekly-goal

Cuerpo: `{ "weekly_goal": 1..7 }`. El cambio aplica desde la semana actual y queda registrado en `weekly_goal_history`, de modo que las semanas pasadas se evalúan con la meta vigente en cada una. Responde el nuevo estado de la racha.

### GET /users/stats

Estadísticas del usuario: totales (entrenamientos, minutos, calorías de fuerza y cardio, series, volumen en kg, minutos de cardio), totales del mes, ejercicio favorito, récords personales (mayor peso por ejercicio) y series por grupo muscular.

### GET /users/search?q=

Busca usuarios por nombre de usuario o nombre completo. Devuelve `{ "users": [...] }` con un máximo de 20 resultados; términos de menos de 2 caracteres devuelven una lista vacía.

### GET /users/{userID}

Perfil público: nombre, bio, nivel, XP, racha, contadores de seguidores y seguidos, `is_following` e `is_me`. `404` si el usuario no existe.

### POST / DELETE /users/{userID}/follow

Sigue o deja de seguir al usuario. Responde `{ "message", "profile" }` con los contadores actualizados. Seguirse a uno mismo responde `400`. Seguir genera una notificación de tipo `follow`.

### GET /users/{userID}/followers · GET /users/{userID}/following

Listas de seguidores y seguidos: `{ "users": [...] }`.

### GET /users/{userID}/workouts

Entrenamientos que se muestran en un perfil: `{ "workouts": [...] }`. El dueño ve todos; otros usuarios solo ven los públicos y sin notas.

## Entrenamientos

### POST /workouts

Registra una sesión de entrenamiento. Cuerpo:

```json
{
  "title": "Pierna",
  "duration_minutes": 60,
  "notes": "opcional",
  "is_public": false,
  "workout_date": "2026-10-12",
  "exercises": [
    { "exercise_id": "uuid", "sets": 4, "reps": 10, "weight": 60, "order_number": 1 },
    { "exercise_id": "uuid", "sets": 1, "reps": 1, "duration_seconds": 1200, "order_number": 2 }
  ]
}
```

- `duration_minutes` debe ser mayor a cero y se requiere al menos un ejercicio.
- `workout_date` es opcional (vacío = hoy) y admite hasta 3 días hacia atrás.
- `is_public` es `false` si no se envía.
- `calories_burned` ya no se acepta: el servidor estima las calorías como MET × peso × horas. El cardio usa el MET y la duración de cada ejercicio; la fuerza, un MET fijo sobre el resto de la duración. Si el usuario no registró `weight_kg`, la estimación queda en 0.

El registro otorga 100 XP, recalcula el nivel (cada 500 XP), actualiza la racha semanal, el progreso de los retos y los logros. Responde `201` con:

```json
{
  "message": "entrenamiento registrado correctamente",
  "workout": { ... },
  "celebration": { "streak_weeks": 3, "completed_challenges": ["Semana Activa"] }
}
```

`celebration` indica qué celebrar en la app: semana de racha completada y retos terminados.

### GET /workouts

Historial del usuario autenticado. Cada entrenamiento incluye un `summary` con número de ejercicios, series, volumen, minutos de cardio y nombres de ejercicios.

### GET /workouts/{workoutID}

Detalle con sus ejercicios: `{ "workout", "is_owner" }`. Si el entrenamiento es privado y no pertenece al usuario, responde `404`; si es público, se omiten las notas.

### PATCH /workouts/{workoutID}

Cuerpo: `{ "title" }`. Solo el dueño puede renombrarlo. Responde `{ "title" }`.

### PATCH /workouts/{workoutID}/visibility

Cuerpo: `{ "is_public": true }`. Solo el dueño. Responde `{ "is_public" }`.

## Ejercicios

### GET /exercises

Catálogo global más los ejercicios personalizados del usuario (`is_custom: true`). Cada ejercicio incluye grupo muscular, equipo, dificultad, `met` (solo cardio) y los datos de imagen y licencia (`image_url`, `image_author`, `image_license`, `image_license_url`, `image_source_url`).

### POST /exercises

Crea un ejercicio personalizado. Cuerpo: `{ "name", "muscle_group" }`. El nombre admite hasta 60 caracteres y no puede repetirse para el mismo usuario (`409`). Grupos válidos: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `full_body`, `cardio`. Responde `201` con el ejercicio.

### DELETE /exercises/{exerciseID}

Quita un ejercicio propio de la lista. Los entrenamientos que ya lo usan lo conservan. Responde `204`; `404` si no existe o no es del usuario.

## Feed social

### GET /posts

Publicaciones de todos los usuarios, de la más reciente a la más antigua, **por páginas**. Parámetros opcionales: `limit` (por omisión 20, máximo 50) y `cursor`. Si hay más publicaciones, la respuesta incluye el encabezado `X-Next-Cursor`; para pedir la página siguiente se envía su valor como `cursor`. El cursor es opaco y uno inválido devuelve `400`. El cuerpo sigue siendo un arreglo de publicaciones. Cada publicación incluye autor (`username`, `full_name`), `content`, `post_type`, `achievement_id` opcional, `like_count`, `liked_by_me`, `comment_count` y fechas.

Tipos de publicación: `training`, `question`, `achievement` y `general`.

### POST /posts

Cuerpo: `{ "content", "post_type" }`. El contenido pasa por el filtro de lenguaje inapropiado; si no lo supera responde `400`. Responde `201` con `{ "message", "post" }`.

### DELETE /posts/{postID}

Elimina una publicación propia. Sus likes, comentarios, reportes y notificaciones se eliminan en cascada. Si la publicación no existe o pertenece a otro usuario, responde `400`.

## Likes

### POST /posts/{postID}/likes · DELETE /posts/{postID}/likes

Da o quita el like del usuario autenticado. Responden `{ "message", "liked" }`. Dar like a una publicación ajena genera una notificación de tipo `like` (una por usuario y publicación).

## Comentarios

### GET /posts/{postID}/comments

Comentarios de la publicación con autor y fecha.

### POST /posts/{postID}/comments

Cuerpo: `{ "content" }` (1–500 caracteres). Responde `201` con `{ "message", "comment" }` y genera una notificación de tipo `comment` para el autor de la publicación (salvo que comente en la suya).

### DELETE /posts/{postID}/comments/{commentID}

Elimina un comentario propio. El backend valida la propiedad del comentario; si no pertenece al usuario responde `400`.

## Notificaciones

### GET /notifications

Últimas 50 notificaciones: `{ "notifications": [...] }`. Cada una incluye `type` (`like`, `comment`, `follow`), `is_read`, `created_at`, el `actor` (usuario que la originó) y, según el tipo, `post_id`, `post_preview` y `comment_preview`.

### GET /notifications/unread-count

`{ "unread": 3 }`. La app lo usa para el indicador de la campana.

### POST /notifications/read-all

Marca todas las notificaciones del usuario como leídas.

## Retos

### GET /challenges

Retos con el estado del usuario autenticado en cada uno: `id`, `title`, `description`, `goal`, `xp_reward`, `status` (`upcoming`, `active`, `completed`), `start_date`, `end_date`, `joined`, `progress` y `completed`.

### POST /challenges/{challengeID}/join

Une al usuario a un reto activo. Responde `{ "message", "challenge_id", "joined": true }`.

El progreso se basa en entrenamientos completados dentro del período del reto. Al alcanzar la meta, la participación se marca como completada y se suma la recompensa de XP.

## Ranking

### GET /rankings

Clasificación de usuarios:

1. XP acumulado en orden descendente.
2. Racha en orden descendente como desempate.
3. Fecha de creación de la cuenta como desempate adicional.

Cada entrada incluye `position`, `user_id`, `username`, `full_name`, `level`, `xp`, `streak` e `is_me`. Antes de calcularla se recalculan las rachas para que reflejen la semana actual.

## Reportes y moderación

### POST /reports

**Autenticación:** Cualquier usuario autenticado.

Cuerpo: `{ "post_id", "report_type", "description" }`. Tipos: `inappropriate_content`, `harassment`, `spam`, `misinformation`, `other`. La descripción es obligatoria (máximo 500 caracteres) y no se puede reportar una publicación propia. Responde `201` con `{ "message", "report" }`.

### GET /reports/pending

**Autenticación:** Rol `admin`.

Reportes con estado `pending`: `{ "reports": [...] }`.

### PUT /reports/{reportID}

**Autenticación:** Rol `admin`.

Cuerpo: `{ "status", "notes" }`, con `status` en `reviewed`, `resolved` o `dismissed`. Registra al moderador y la fecha de revisión. `404` si el reporte no existe.

El rol se verifica en la base de datos en cada petición (middleware `RequireRole`); un usuario sin rol `admin` recibe `403`.

## Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Operación exitosa |
| 201 | Recurso creado correctamente |
| 204 | Operación exitosa sin contenido |
| 400 | Solicitud inválida o regla de negocio incumplida |
| 401 | Autenticación requerida, token inválido o expirado |
| 403 | Rol insuficiente |
| 404 | Recurso no encontrado o no visible para el usuario |
| 409 | Conflicto (nombre de usuario, correo o ejercicio duplicado) |
| 429 | Demasiadas solicitudes (incluye el encabezado `Retry-After`) |
| 500 | Error interno del servidor |
| 503 | Recuperación de contraseña desactivada |

## Observaciones técnicas

- El límite de peticiones guarda los contadores en memoria por instancia y toma la IP de `RemoteAddr`. Detrás del proxy de Render, moverlo a un almacén compartido y leer la IP real del encabezado del proxy queda como mejora.
- El filtro de lenguaje se aplica a las publicaciones, no a los comentarios.
