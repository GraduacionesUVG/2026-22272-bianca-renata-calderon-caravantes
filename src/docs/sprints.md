# Sprints — Gymify

## Planificación general

El desarrollo de Gymify se organiza mediante un enfoque iterativo e incremental dividido en seis sprints. Las fechas y actividades corresponden al Plan de Trabajo del protocolo, mientras que los ajustes realizados durante la ejecución se documentan para mantener trazabilidad entre la planificación y el desarrollo real.

Estado final del desarrollo.

| Sprint | Período | Fase | Actividades principales | Estado |
|---|---|---|---|---|
| Sprint 1 | 6 Jul – 26 Jul | Análisis y Diseño | Alcance, usuarios objetivo, historias de usuario, Product Backlog, criterios de aceptación, arquitectura, API REST, base de datos, UX/UI y configuración del entorno. | Completado |
| Sprint 2 | 27 Jul – 16 Ago | Desarrollo Base | Backend, PostgreSQL, rutas, middleware, JWT, bcrypt, registro, inicio de sesión, perfil, navegación y conexión inicial frontend–backend. | Completado (cerró el 25 ago) |
| Sprint 3 | 17 Ago – 6 Sep | Gamificación | Registro de entrenamientos, rachas, XP, niveles y logros desbloqueables. | Completado |
| Sprint 4 | 7 Sep – 27 Sep | Comunidad | Feed social, publicación de logros, likes, comentarios, edición de perfil, recuperación de contraseña y retos grupales. | Completado |
| Sprint 5 | 28 Sep – 11 Oct | Integración | Restricciones de contenido, reportes, ranking, integración completa, pruebas funcionales y despliegue en la nube. | Completado |
| Sprint 6 | 12 Oct – 24 Oct | Validación | Optimización, corrección de errores, mejoras visuales, piloto, encuesta final y análisis de resultados. | Completado |
| Cierre | 25 Oct – 31 Oct | Entrega | Revisión del documento, correcciones, bibliografía y preparación de presentación y defensa. | Completado |

## Ejecución y ajustes del desarrollo

La metodología iterativa e incremental permite ajustar el orden de implementación cuando el estado del prototipo lo requiere. Los cambios de orden no eliminan los requerimientos definidos en el protocolo, sino que modifican su momento de ejecución.

### Sprint 1 — Análisis y Diseño

- [x] Definición del alcance.
- [x] Identificación de usuarios objetivo.
- [x] Historias de usuario y Product Backlog.
- [x] Criterios de aceptación iniciales.
- [x] Arquitectura general del sistema.
- [x] Diseño preliminar de API REST.
- [x] Diseño de base de datos.
- [x] Mockups y prototipo UX/UI.
- [x] Estructura del monorepo.
- [x] Configuración del entorno de desarrollo.
- [x] Encuesta 1 (diagnóstico), adelantada desde el Sprint 4: 14–16 de julio, 5 respuestas.

### Sprint 2 — Desarrollo Base

- [x] Servidor backend en Golang (enrutador chi en lugar de Gin).
- [x] Conexión con PostgreSQL.
- [x] Rutas y middleware.
- [x] Autenticación mediante JWT.
- [x] Contraseñas protegidas mediante bcrypt.
- [x] Registro de usuarios.
- [x] Inicio de sesión.
- [x] Visualización y edición de perfil.
- [x] Navegación del frontend.
- [x] Consumo inicial de la API REST.

### Sprint 3 — Gamificación

- [x] Registro de entrenamientos.
- [x] Catálogo y selección de ejercicios.
- [x] Sistema de rachas (diaria al inicio; reemplazada por semanal en el Sprint 5).
- [x] Asignación automática de XP.
- [x] Sistema de niveles.
- [x] Logros desbloqueables.
- [x] Visualización del progreso del usuario.

### Sprint 4 — Comunidad

- [x] Feed social.
- [x] Publicación de logros.
- [x] Likes en publicaciones.
- [x] Comentarios en publicaciones.
- [x] Eliminación de comentarios propios (backend e interfaz).
- [x] Retos grupales.
- [x] Inscripción del usuario a retos.
- [x] Actualización automática del progreso de retos mediante entrenamientos.
- [x] Recompensas de XP al completar retos.
- [x] Visualización de retos y progreso.
- [x] Integración del reto activo en Home.
- [x] Recuperación de contraseña (completada en el Sprint 5).
- [x] Ajustes finales de edición de perfil: modo de edición explícito (completado en el Sprint 5).
- [x] Evaluación formativa de usabilidad (realizada con el piloto, desde el 8 de octubre).

### Sprint 5 — Integración

- [x] Ranking de usuarios por XP con desempate por racha (HU-14).
- [x] Recuperación de contraseña con código de 6 dígitos por correo (HU-18).
- [x] Eliminación de publicaciones propias y modo de edición explícito del perfil.
- [x] Reporte de publicaciones desde el feed (HU-15).
- [x] Panel de moderación con permisos por rol de administrador (HU-16).
- [x] Sistema de seguidores, búsqueda de usuarios y perfiles públicos.
- [x] Racha semanal ligada a una meta personal, con historial de metas.
- [x] Resúmenes de entrenamiento, imágenes y vista previa de ejercicios, historial de actividad.
- [x] Pruebas funcionales de los endpoints con `curl`.
- [x] Despliegue en la nube: backend en Render, base de datos en Neon, frontend en Netlify como PWA.
- [x] Inicio del piloto, adelantado desde el Sprint 6: 7 cuentas registradas el 8 y 9 de octubre.
- [x] Catálogo ampliado a 44 ejercicios, con cardio por tiempo.
- [x] Visibilidad pública o privada de cada entrenamiento.
- [x] Notificaciones dentro de la app por likes, comentarios y seguidores (HU-17).
- [x] Aviso de espera mientras el servidor gratuito despierta.
- [x] Mejoras por retroalimentación del piloto: resumen al guardar, calorías por MET, registro de hasta 3 días atrás, celebraciones desactivables e íconos de navegación.
- [x] Sesión deslizante de 30 días.

### Sprint 6 — Validación

- [x] Continuación del piloto: 13 cuentas activas al 12 de octubre.
- [x] Correo de recuperación con STARTTLS obligatorio.
- [x] Ejercicios propios, cronómetro, calorías de fuerza y estadísticas en el perfil.
- [x] Actualización de la documentación del repositorio.
- [x] Encuesta 2 (evaluación final) y análisis de resultados.

## Ajustes respecto al plan original

Durante el Sprint 4 se adelantó la implementación de retos grupales con el propósito de contar con un prototipo más representativo del componente de gamificación social antes de realizar la evaluación de usabilidad.

La recuperación de contraseña estaba planificada para el Sprint 4, pero se reprogramó como actividad prioritaria del Sprint 5, donde fue completada.

El piloto se adelantó al cierre del Sprint 5 (8 de octubre) y continuó durante el Sprint 6. Funcionó como evaluación formativa de usabilidad sobre un prototipo publicado en la nube que ya incluía los flujos de comunidad, gamificación y retos. Sus hallazgos se aplicaron en pocos días, porque la PWA permite publicar cada mejora sin que los participantes reinstalen la app.

La racha diaria del Sprint 3 se reemplazó por una racha semanal ligada a una meta personal. Una racha diaria castiga los días de descanso, que forman parte de cualquier rutina de gimnasio.

La aplicación se distribuyó como PWA y no en App Store ni Google Play. Publicar en las tiendas exige cuentas de desarrollador de pago y revisiones de varios días.

## Pendientes y trabajo futuro

- Aplicar el filtro de lenguaje también a los comentarios.
- Notificaciones push y funcionamiento sin conexión (requieren un *service worker*).
- Pruebas automatizadas del frontend y pruebas de integración de la API contra una base de datos de prueba.
- Mover el límite de peticiones a un almacén compartido y tomar la IP real desde la cabecera del proxy.
