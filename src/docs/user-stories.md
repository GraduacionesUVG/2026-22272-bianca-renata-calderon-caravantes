# Historias de Usuario - Gymify

Este documento describe las historias de usuario y sus criterios de aceptación. La numeración corresponde al Product Backlog del proyecto.

## HU-01 Registro de usuario

Como usuario nuevo,
quiero crear una cuenta en Gymify,
para registrar mis entrenamientos y dar seguimiento a mi progreso.

### Criterios de aceptación

- El usuario puede registrarse mediante correo y contraseña.
- El correo debe ser único.
- La contraseña se almacena de forma segura.
- El sistema confirma el registro exitoso.

## HU-02 Inicio de sesión

Como usuario registrado,
quiero iniciar sesión en la aplicación,
para acceder a mis datos y progreso.

### Criterios de aceptación

- El usuario puede ingresar correo y contraseña.
- El sistema valida las credenciales.
- Las credenciales incorrectas no conceden acceso.
- Una autenticación válida permite acceder a las funcionalidades protegidas.

## HU-03 Visualizar perfil

Como usuario,
quiero consultar mi perfil,
para observar mi información, estadísticas y progreso.

### Criterios de aceptación

- Se muestra la información principal del usuario.
- Se muestra el nivel actual.
- Se muestra el XP acumulado.
- Se muestra la racha actual.
- Se muestran los logros obtenidos.
- El usuario puede actualizar la información editable de su perfil.

## HU-04 Registrar entrenamiento

Como usuario,
quiero registrar una sesión de entrenamiento,
para llevar control de mi actividad física.

### Criterios de aceptación

- El usuario puede seleccionar ejercicios disponibles.
- Se registra la duración del entrenamiento.
- El usuario puede agregar información complementaria disponible en el formulario.
- El entrenamiento queda asociado al usuario autenticado.
- El registro queda almacenado y disponible en el historial.
- Un entrenamiento registrado actualiza los sistemas de gamificación correspondientes.

## HU-05 Sistema de rachas (Streaks)

Como usuario,
quiero mantener una racha de entrenamiento,
para motivarme a ser constante.

### Criterios de aceptación

- El usuario define una meta semanal de días de entrenamiento (1 a 7) y puede cambiarla.
- La racha cuenta las semanas consecutivas, de lunes a domingo en la hora de Guatemala, en que se cumplió la meta.
- La semana en curso no rompe la racha mientras todavía pueda cumplirse.
- La racha se actualiza al registrar entrenamientos válidos, incluidos los registrados hasta 3 días atrás.
- La racha actual queda almacenada.
- El usuario puede visualizar su racha y los días entrenados de la semana.

La racha diaria del diseño inicial se reemplazó por esta racha semanal para no castigar los días de descanso.

## HU-06 Sistema de experiencia (XP)

Como usuario,
quiero recibir puntos de experiencia,
para visualizar mi progreso dentro de Gymify.

### Criterios de aceptación

- Registrar un entrenamiento válido otorga XP.
- Las recompensas de gamificación definidas pueden otorgar XP adicional.
- El XP acumulado queda almacenado.
- El usuario puede visualizar su XP total.

## HU-07 Sistema de niveles

Como usuario,
quiero subir de nivel conforme acumulo XP,
para percibir progresión dentro de la aplicación.

### Criterios de aceptación

- Existen umbrales definidos para el cambio de nivel.
- El nivel se calcula a partir del XP acumulado.
- El sistema actualiza el nivel automáticamente.
- El nivel actual es visible para el usuario.

## HU-08 Sistema de logros

Como usuario,
quiero desbloquear logros al cumplir objetivos,
para recibir reconocimiento por mis avances.

### Criterios de aceptación

- Cada logro posee una condición de desbloqueo.
- El sistema evalúa automáticamente las condiciones implementadas.
- Los logros obtenidos quedan asociados al usuario.
- El usuario puede visualizar sus logros desbloqueados.

## HU-09 Feed social

Como usuario,
quiero visualizar publicaciones de la comunidad,
para conocer e interactuar con el progreso de otros usuarios.

### Criterios de aceptación

- El usuario autenticado puede acceder al feed.
- El feed muestra publicaciones disponibles.
- Cada publicación muestra la información necesaria para identificar su contenido y autor.
- El usuario puede acceder a las interacciones disponibles desde la publicación.

## HU-10 Publicar logros

Como usuario,
quiero compartir mis logros en el feed social,
para mostrar mi progreso a la comunidad.

### Criterios de aceptación

- El usuario puede crear una publicación a partir de un logro disponible.
- La publicación queda asociada al usuario.
- La publicación aparece en el feed social.
- El contenido compartido permite identificar el logro correspondiente.

## HU-11 Dar like a publicaciones

Como usuario,
quiero reaccionar mediante un like a publicaciones,
para apoyar la actividad de otros miembros de la comunidad.

### Criterios de aceptación

- El usuario puede dar like a una publicación.
- El usuario puede retirar su like.
- El sistema mantiene actualizado el total de likes.
- La interfaz refleja si el usuario actual ha dado like.

## HU-12 Comentar publicaciones

Como usuario,
quiero comentar publicaciones,
para interactuar con otros usuarios.

### Criterios de aceptación

- El usuario puede consultar los comentarios de una publicación.
- El usuario puede agregar un comentario.
- El comentario queda asociado al usuario y a la publicación.
- El total de comentarios se actualiza.
- El usuario puede eliminar únicamente sus propios comentarios.
- La interfaz debe mostrar la acción de eliminación cuando corresponda.

## HU-13 Retos grupales

Como usuario,
quiero participar en retos grupales,
para mantener mi motivación y trabajar hacia metas compartidas.

### Criterios de aceptación

- El usuario puede consultar los retos disponibles.
- El usuario puede unirse a un reto activo.
- El sistema muestra la meta y recompensa del reto.
- El usuario puede visualizar su progreso.
- Los entrenamientos válidos actualizan automáticamente el progreso de los retos activos en los que participa.
- El progreso no supera la meta establecida.
- Al completar un reto, el sistema lo marca como completado.
- La recompensa de XP definida se concede al completar el reto.

## HU-14 Ranking de usuarios

Como usuario,
quiero visualizar un ranking,
para consultar mi posición y comparar mi progreso con otros participantes.

### Criterios de aceptación

- El ranking muestra la posición de los usuarios según el criterio de clasificación definido.
- Cada entrada muestra información suficiente para identificar al participante y su progreso relevante.
- El sistema determina automáticamente las posiciones.
- El usuario puede identificar su propia posición dentro del ranking.

## HU-15 Reportar contenido

Como usuario,
quiero reportar publicaciones que considere inapropiadas,
para contribuir a mantener una comunidad saludable.

### Criterios de aceptación

- El usuario puede reportar una publicación.
- El reporte queda asociado a la publicación correspondiente.
- El sistema registra el reporte para su posterior revisión.
- Una misma acción no debe generar reportes duplicados de forma accidental.

## HU-16 Moderación de publicaciones

Como administrador,
quiero revisar contenido reportado,
para gestionar publicaciones que incumplan las reglas de la comunidad.

### Criterios de aceptación

- El administrador puede consultar contenido reportado.
- Se muestra la información necesaria para revisar el reporte.
- Las acciones de moderación están restringidas a usuarios autorizados.
- El sistema permite registrar la resolución correspondiente.

## HU-17 Notificaciones

Como usuario,
quiero recibir notificaciones sobre actividad relevante,
para conocer eventos relacionados con mi progreso y participación social.

### Criterios de aceptación

- El sistema puede generar notificaciones para los eventos definidos.
- El usuario puede consultar sus notificaciones.
- Las notificaciones están asociadas al usuario correspondiente.
- El usuario puede distinguir notificaciones leídas y no leídas.

## HU-18 Recuperación de contraseña

Como usuario registrado,
quiero recuperar el acceso a mi cuenta cuando olvide mi contraseña,
para poder volver a ingresar a Gymify de forma segura.

### Criterios de aceptación

- El usuario puede iniciar la recuperación mediante su correo registrado.
- El proceso de recuperación utiliza un mecanismo temporal y de un solo uso.
- El usuario puede establecer una nueva contraseña válida.
- La nueva contraseña se almacena de forma segura.
- Un mecanismo de recuperación utilizado o expirado no puede reutilizarse.
- El usuario puede iniciar sesión con la nueva contraseña después de completar el proceso.
