# Gymify - Diseño del Sistema de Gamificación

## Descripción

Gymify utiliza mecánicas de gamificación para reforzar la constancia, la progresión y la participación del usuario.

El sistema implementado integra:

- experiencia (XP);
- niveles;
- racha semanal ligada a una meta personal;
- logros;
- retos grupales;
- ranking;
- celebraciones al cumplir la meta semanal o completar un reto.

Este documento describe el comportamiento implementado en el backend. Los valores citados provienen del código y de los catálogos en `backend/deploy/catalogs.sql`.

## Flujo general

Al registrar un entrenamiento, `WorkoutService.CreateWorkout` ejecuta las mecánicas en este orden:

`Entrenamiento → +100 XP y nivel → Racha semanal → Logros → Retos → Celebración`

Las recompensas de logros y retos suman XP y, como consecuencia, pueden modificar el nivel.

## Sistema de experiencia (XP)

### XP por entrenamiento

Cada entrenamiento registrado otorga:

`XPPerWorkout = 100`

El XP se acumula en `users.xp`. No depende de la duración, de los ejercicios ni de las calorías.

### XP adicional

Además de los entrenamientos, el usuario recibe XP por:

- desbloquear logros;
- completar retos.

La cantidad depende del `xp_reward` configurado en cada logro o reto.

## Sistema de niveles

Cada nivel requiere `XPPerLevel = 500` XP. La fórmula, con división entera, es:

`nivel = (XP / 500) + 1`

| XP acumulado | Nivel |
|---:|---:|
| 0 - 499 | 1 |
| 500 - 999 | 2 |
| 1000 - 1499 | 3 |
| 1500 - 1999 | 4 |

El nivel se recalcula en la misma consulta que suma el XP, ya sea por entrenamiento, logro o reto.

## Racha semanal

### Meta semanal

El usuario elige cuántos días por semana quiere entrenar, entre 1 y 7 (`MinWeeklyGoal` y `MaxWeeklyGoal`). Mientras no la elija, `users.weekly_goal` es NULL y la app se la pide al iniciar sesión (pantalla `WeeklyGoalScreen`). Puede cambiarla desde el perfil con `PUT /api/v1/users/weekly-goal`.

### Historial de metas

Cada cambio se guarda en `weekly_goal_history` con el lunes de la semana en que se hizo (`week_start`). La meta vigente en una semana es la del último cambio hecho en esa semana o antes. Por eso cambiar la meta aplica desde la semana actual y no altera las semanas anteriores.

### Semana y zona horaria

- La semana va de lunes a domingo: se obtiene con `date_trunc('week', ...)` de PostgreSQL, que siempre devuelve un lunes.
- Cada conexión a la base de datos fija la zona horaria `APP_TIMEZONE`, por defecto `America/Guatemala`, así que el cambio de día y de semana ocurre a medianoche de Guatemala.
- Solo cuentan días distintos con al menos un entrenamiento completado: varios entrenamientos el mismo día cuentan como uno.

### Reglas de cálculo

La racha cuenta semanas consecutivas en las que el usuario cumplió su meta (`calculateWeeklyStreak` en `streak_service.go`):

1. La semana actual suma 1 si ya cumplió su meta. Si todavía no la cumple, sigue en curso y no rompe la racha.
2. Cada semana anterior consecutiva que cumplió su meta suma 1.
3. La primera semana terminada sin cumplir la meta, o anterior a la primera meta elegida, corta la cuenta.

Ejemplo con meta de 3 días:

| Semana | Días entrenados | Racha al final de la semana |
|---|---:|---:|
| 1 | 3 | 1 |
| 2 | 4 | 2 |
| 3 | 1 | 0 |
| 4 | 3 | 1 |

Durante la semana 3, mientras seguía en curso, la racha se mostraba en 2. Al terminar sin cumplir la meta, se rompió.

### Cálculo bajo demanda

La racha puede romperse solo con el paso del tiempo, sin que el usuario haga nada. Por eso no se actualiza únicamente al registrar un entrenamiento: se recalcula al consultarla (inicio, perfil, `GET /api/v1/users/streak`) y se guarda en `users.streak`. El ranking recalcula la racha de todos los usuarios antes de ordenar.

### Registro retroactivo

Se puede registrar un entrenamiento de hasta 3 días atrás (`MaxBackdateDays = 3`). Esto cubre olvidos recientes sin permitir rehacer semanas pasadas para salvar la racha. No se aceptan fechas futuras.

## Sistema de logros

Tras cada entrenamiento, `AchievementService.CheckAndUnlock` evalúa estas condiciones:

| Logro | Condición | Recompensa |
|---|---|---:|
| Primer entrenamiento | Al menos 1 entrenamiento completado | 50 XP |
| En marcha | Al menos 5 entrenamientos completados | 100 XP |
| Constancia | Racha de al menos 3 semanas | 100 XP |
| Imparable | Racha de al menos 7 semanas | 200 XP |
| 500 Club | Al menos 500 XP | 150 XP |
| Nivel 2 | Al menos nivel 2 | 100 XP |

### Desbloqueo y recompensa

Cada logro se desbloquea una sola vez: `user_achievements` tiene una restricción única por usuario y logro, y la inserción usa `ON CONFLICT DO NOTHING`. Solo cuando la inserción es nueva:

1. se registra el logro del usuario;
2. se suma su `xp_reward`;
3. se recalcula el nivel.

### Compartir logros

Un logro desbloqueado puede compartirse en el feed (`POST /api/v1/users/achievements/{id}/share`). La publicación indica el logro y su recompensa de XP. La restricción `unique_shared_achievement` impide compartir el mismo logro más de una vez.

## Sistema de retos

### Catálogo

| Reto | Meta | Recompensa | Vigencia |
|---|---:|---:|---|
| Primer Impulso | 2 entrenamientos | 100 XP | 1 sep – 31 dic 2026 |
| Semana Activa | 3 entrenamientos | 150 XP | 1 sep – 31 dic 2026 |
| A Todo Ritmo | 5 entrenamientos | 250 XP | 1 sep – 31 dic 2026 |

### Participación y progreso

El usuario se une con `POST /api/v1/challenges/{id}/join`. Cada entrenamiento suma 1 al progreso de los retos en los que participa, si:

- la fecha del entrenamiento está dentro de la vigencia del reto;
- la fecha no es anterior al día en que el usuario se unió (importante con el registro retroactivo);
- el reto todavía no está completado.

El progreso no supera la meta.

### Finalización y recompensa

Cuando el progreso alcanza la meta:

1. la participación se marca como completada;
2. se suma el `xp_reward` del reto al usuario;
3. se recalcula el nivel.

## Ranking

`GET /api/v1/rankings` ordena a todos los usuarios por:

1. XP, de mayor a menor;
2. racha, de mayor a menor, como desempate;
3. fecha de registro, la más antigua primero.

Antes de ordenar se recalculan las rachas para que no aparezcan rachas ya rotas. La respuesta marca al usuario autenticado (`is_me`) y la interfaz lo resalta. El ranking se muestra dentro de la sección de Retos.

## Celebraciones

Al registrar un entrenamiento, el backend devuelve un objeto `celebration` cuando:

- la racha subió de semanas, es decir, ese entrenamiento completó la meta semanal (también si es retroactivo y completó la semana anterior); o
- el entrenamiento completó uno o más retos.

La app muestra entonces una animación de confeti con la mascota (`CelebrationOverlay`). El usuario puede desactivarla en su perfil (`users.celebrations_enabled`, `PATCH /api/v1/users/settings`). Si está desactivada, el backend no devuelve la celebración.

## Calorías estimadas

Las calorías son información para el usuario y no otorgan XP. Se calculan en el backend para que la app no pueda enviar un valor inventado:

`calorías ≈ MET × peso (kg) × horas`

- **Cardio:** usa el MET de cada ejercicio y su duración (Running 8.3, Cycling 7.0, Stair Climbing 8.0).
- **Fuerza:** usa `StrengthMET = 3.5` sobre el resto de la duración total, descansos incluidos.
- Los minutos de cardio no pueden superar la duración total del entrenamiento.
- Sin peso en el perfil (`users.weight_kg`, entre 25 y 300 kg), las calorías quedan en 0.

Los valores MET provienen del Compendium of Physical Activities (Ainsworth et al., 2011).

## Ejercicios personalizados

Además del catálogo, cada usuario puede crear sus propios ejercicios (`exercises.created_by`). Solo los ve quien los creó. Un entrenamiento con ejercicios propios otorga el mismo XP y cuenta igual para la racha, los logros y los retos.

## Notificaciones

Las notificaciones dentro de la app refuerzan el componente social, no el de progreso. Se generan cuando otro usuario da like a una publicación, la comenta o empieza a seguir al usuario (tipos `like`, `comment` y `follow`). Si se retira el like o se deja de seguir, la notificación se elimina. No hay notificaciones push.

## Relación entre mecánicas

Un entrenamiento puede producir la siguiente cadena:

`Entrenamiento registrado`
`→ +100 XP y actualización de nivel`
`→ recálculo de la racha semanal`
`→ evaluación de logros → posible XP por logro`
`→ actualización de retos → posible XP por reto`
`→ celebración si se cumplió la meta semanal o un reto`

## Clasificación Octalysis

El marco Octalysis distingue dos tipos de motivación:

- **White Hat:** motivaciones positivas (logro, progreso, sentido, pertenencia), que hacen que el usuario se sienta bien y con control.
- **Black Hat:** urgencia, escasez o miedo a perder algo. Son efectivas, pero si se abusa de ellas generan ansiedad.

| Mecánica | Tipo | Motivación |
|---|---|---|
| XP y niveles | White Hat | Desarrollo y logro |
| Logros | White Hat | Desarrollo y logro |
| Retos | White Hat | Desarrollo y logro; influencia social |
| Feed, likes, comentarios, seguidores | White Hat | Influencia social y pertenencia |
| Ranking | Mixta | Influencia social; comparación con otros |
| Racha semanal | Black Hat moderada | Miedo a perder lo acumulado |

Gymify prioriza las mecánicas White Hat y limita el Black Hat a la racha. La racha diaria original se reemplazó por una semanal ligada a la meta del usuario. Así conserva la aversión a la pérdida sin castigar los días de descanso, que son parte de cualquier rutina de gimnasio. Además, la semana en curso nunca rompe la racha antes de terminar.

## Consideraciones técnicas

### Recompensas únicas de logros

La restricción única de `user_achievements` evita duplicar un logro. Si ya estaba desbloqueado, no se vuelve a entregar XP.

### Atomicidad

El registro del entrenamiento con sus ejercicios y el cálculo de calorías se ejecutan en una transacción. Las recompensas posteriores (XP, logros, retos) se aplican en consultas consecutivas. Agruparlas en una misma transacción es una mejora pendiente.

## Mejoras previstas

- Agrupar en una transacción el entrenamiento y todas sus recompensas.
- Agregar logros de participación social (por ejemplo, primeros comentarios o seguidores).
- Evaluar una progresión de niveles no lineal.
- Ampliar los tipos de retos.
