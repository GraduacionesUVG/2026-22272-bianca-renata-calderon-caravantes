# Product Backlog - Gymify

## Descripción

El Product Backlog contiene las funcionalidades identificadas para el desarrollo de Gymify. Las historias de usuario se priorizan según su importancia para el funcionamiento del sistema y el cumplimiento de los objetivos del proyecto.

El estado de cada historia permite mantener trazabilidad entre los requerimientos planificados y su implementación actual.

---

## Prioridad Alta (MVP)

### HU-01 Registro de Usuario
Como usuario nuevo,
Quiero crear una cuenta,
Para poder utilizar la aplicación.

**Estado:** Completado.

### HU-02 Inicio de Sesión
Como usuario registrado,
Quiero iniciar sesión,
Para acceder a mis datos y progreso.

**Estado:** Completado.

### HU-03 Visualizar Perfil
Como usuario,
Quiero visualizar mi información personal,
Para consultar mi progreso dentro de la aplicación.

**Estado:** Completado.

### HU-04 Registrar Entrenamiento
Como usuario,
Quiero registrar mis sesiones de entrenamiento,
Para llevar control de mi actividad física.

**Estado:** Completado.

### HU-05 Sistema de Rachas (Streaks)
Como usuario,
Quiero mantener una racha de entrenamiento,
Para motivarme a ser constante.

**Estado:** Completado.

La racha es semanal: cuenta las semanas consecutivas en que el usuario cumple la meta de días de entrenamiento que él mismo define (1 a 7). Reemplazó a la racha diaria inicial para no castigar los días de descanso.

### HU-06 Sistema de Experiencia (XP)
Como usuario,
Quiero recibir experiencia por entrenar,
Para visualizar mi progreso.

**Estado:** Completado.

### HU-07 Sistema de Niveles
Como usuario,
Quiero subir de nivel,
Para sentir una progresión dentro de la aplicación.

**Estado:** Completado.

### HU-08 Sistema de Logros
Como usuario,
Quiero desbloquear logros,
Para recibir reconocimiento por mis avances.

**Estado:** Completado.

---

## Prioridad Media

### HU-09 Feed Social
Como usuario,
Quiero visualizar publicaciones de otros usuarios,
Para interactuar con la comunidad.

**Estado:** Completado.

### HU-10 Publicar Logros
Como usuario,
Quiero compartir mis logros,
Para mostrar mi progreso.

**Estado:** Completado.

### HU-11 Dar Like a Publicaciones
Como usuario,
Quiero reaccionar a publicaciones,
Para apoyar a otros miembros de la comunidad.

**Estado:** Completado.

### HU-12 Comentar Publicaciones
Como usuario,
Quiero comentar publicaciones,
Para interactuar con otros usuarios.

**Estado:** Completado.

El usuario consulta y agrega comentarios, y puede eliminar los suyos desde la interfaz. El autor de la publicación recibe una notificación por cada comentario nuevo.

### HU-13 Retos Grupales
Como usuario,
Quiero participar en retos grupales,
Para mantener mi motivación.

**Estado:** Completado para el alcance actual del prototipo.

El usuario puede consultar retos, unirse a retos activos, visualizar su progreso y recibir XP al completar la meta. El progreso se actualiza automáticamente al registrar entrenamientos.

### HU-14 Ranking de Usuarios
Como usuario,
Quiero visualizar rankings,
Para comparar mi progreso con otros participantes.

**Estado:** Completado para el prototipo.

El ranking clasifica a los usuarios por XP acumulado en orden descendente. En caso de empate, se utiliza la racha como criterio de desempate. La interfaz muestra la posición, nivel, XP y racha de cada participante, e identifica visualmente la posición del usuario autenticado.

---

## Prioridad Baja

### HU-15 Reportar Contenido
Como usuario,
Quiero reportar publicaciones inapropiadas,
Para contribuir a mantener una comunidad saludable.

**Estado:** Completado para el prototipo.

El usuario reporta una publicación desde el feed con un tipo (contenido inapropiado, acoso, spam, desinformación u otro) y una descripción. El reporte queda pendiente de revisión. No se puede reportar una publicación propia. Queda pendiente impedir que el mismo usuario reporte dos veces la misma publicación.

### HU-16 Moderación de Publicaciones
Como administrador,
Quiero revisar contenido reportado,
Para gestionar publicaciones que incumplan las reglas de la comunidad.

**Estado:** Completado para el prototipo.

Los usuarios con rol `admin` acceden al panel de moderación desde su perfil, consultan los reportes pendientes y registran su resolución. Las rutas de moderación están protegidas por rol en el backend. Un filtro automático de lenguaje rechaza publicaciones con contenido inapropiado. Queda pendiente aplicar ese filtro también a los comentarios.

### HU-17 Notificaciones
Como usuario,
Quiero recibir notificaciones,
Para conocer nuevos logros, retos y actividad social.

**Estado:** Completado para el prototipo.

La app genera notificaciones dentro de la aplicación cuando alguien da like o comenta una publicación del usuario, o empieza a seguirlo. El usuario ve el contador de no leídas, la lista de notificaciones y puede marcarlas todas como leídas. No hay notificaciones push: la PWA no tiene *service worker*.

### HU-18 Recuperación de Contraseña
Como usuario registrado,
Quiero recuperar el acceso a mi cuenta cuando olvide mi contraseña,
Para poder volver a ingresar a Gymify de forma segura.

**Estado:** Completado para el prototipo.

Planificada para el Sprint 4 y completada en el Sprint 5. Desde "¿Olvidaste tu contraseña?" el usuario solicita un código de 6 dígitos que recibe por correo, caduca a los 15 minutos y solo puede usarse una vez. Con ese código establece una nueva contraseña, que se almacena con bcrypt. El código se guarda protegido mediante HMAC, se invalida tras 5 intentos fallidos y la API limita la frecuencia de las solicitudes. El correo se envía por SMTP con STARTTLS obligatorio; en desarrollo, sin SMTP configurado, se muestra en el log del servidor. Si el hosting no permite SMTP, la recuperación puede desactivarse con `PASSWORD_RESET_ENABLED=false`.

---

## Tabla de Priorización y Estado

| ID | Funcionalidad | Prioridad | Estado |
|---|---|---|---|
| HU-01 | Registro de usuario | Alta | Completado |
| HU-02 | Inicio de sesión | Alta | Completado |
| HU-03 | Perfil de usuario | Alta | Completado |
| HU-04 | Registro de entrenamiento | Alta | Completado |
| HU-05 | Streaks | Alta | Completado |
| HU-06 | XP | Alta | Completado |
| HU-07 | Niveles | Alta | Completado |
| HU-08 | Logros | Alta | Completado |
| HU-09 | Feed social | Media | Completado |
| HU-10 | Compartir logros | Media | Completado |
| HU-11 | Likes | Media | Completado |
| HU-12 | Comentarios | Media | Completado |
| HU-13 | Retos grupales | Media | Completado para el prototipo |
| HU-14 | Rankings | Media | Completado para el prototipo |
| HU-15 | Reportes de contenido | Baja | Completado para el prototipo |
| HU-16 | Moderación | Baja | Completado para el prototipo |
| HU-17 | Notificaciones | Baja | Completado para el prototipo (sin push) |
| HU-18 | Recuperación de contraseña | Media | Completado para el prototipo |

---

## Mejoras UX identificadas durante la revisión interna

Observaciones de la revisión interna del prototipo, previas a las pruebas con usuarios:

- [x] Mostrar claramente la opción de eliminar comentarios propios en la interfaz.
- [x] Incorporar un modo de edición del perfil mediante un ícono de lápiz, evitando mantener permanentemente activo el botón de guardar cambios.
- [x] Optimizar la selección de ejercicios para utilizar el espacio disponible de manera más eficiente.
- [x] Revisar el manejo del campo de calorías: ya no se le pide al usuario; se estiman con el MET del ejercicio y el peso corporal.
- [ ] Mejorar el contraste y legibilidad de algunos textos en la pantalla de retos (sin cambio registrado en el historial).

---

## Funcionalidades agregadas durante el desarrollo

No formaban parte del backlog original. Surgieron de la revisión interna o de la retroalimentación del piloto:

| Funcionalidad | Origen |
|---|---|
| Seguidores, búsqueda de usuarios y perfiles públicos | Componente social |
| Meta semanal y racha semanal | Revisión del diseño de la racha |
| Resumen, imágenes y vista previa de ejercicios | Revisión interna |
| Visibilidad pública o privada de cada entrenamiento | Piloto |
| Cardio por tiempo y calorías estimadas por MET | Piloto |
| Registro de entrenamientos de hasta 3 días atrás | Piloto |
| Celebraciones al subir la racha o completar un reto | Piloto |
| Sesión deslizante de 30 días | Piloto |
| Ejercicios propios, cronómetro y estadísticas en el perfil | Sprint de validación |
