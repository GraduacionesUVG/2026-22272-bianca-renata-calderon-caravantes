# Pruebas

Gymify se prueba en tres niveles: pruebas automatizadas del servidor (Go),
pruebas manuales de los endpoints y pruebas de rendimiento y de estrés. Este
documento resume cómo se hicieron, con qué herramientas y qué resultados dieron.
El análisis completo está en el documento del trabajo de graduación.

## 1. Pruebas automatizadas del servidor

Herramienta: el paquete `testing` de Go, sin bibliotecas externas.

```bash
cd backend
go test ./...                       # pruebas que no necesitan base de datos
TEST_DATABASE_URL="$DATABASE_URL" go test ./...   # además, las de integración
```

Las pruebas de integración se omiten (`SKIP`) si `TEST_DATABASE_URL` no está
definida, para que `go test ./...` funcione en cualquier computadora. Crean sus
propios usuarios de prueba y los borran al terminar (el borrado en cascada
elimina publicaciones, reportes, entrenamientos, etc.). **Úsalas solo contra una
base de desarrollo, nunca contra producción.**

| Archivo | Qué comprueba | Base de datos |
|---|---|---|
| `internal/mailer/mailer_test.go` | Envío de correo con STARTTLS | No |
| `internal/services/streak_service_test.go` | Cálculo de la racha semanal | No |
| `internal/services/exercise_service_test.go` | Validación de ejercicios personalizados | No |
| `internal/services/moderation_test.go` | Filtro de contenido en publicaciones y comentarios, reporte duplicado (incluido el simultáneo), umbral de reportes que oculta una publicación solo a los demás, aprobación y retiro por un moderador | En parte |
| `internal/services/workout_atomicity_test.go` | Registrar un entrenamiento aplica entrenamiento, XP y logros juntos; con la petición cancelada no se guarda nada | Sí |
| `internal/services/feed_pagination_test.go` | El feed pagina sin repetir ni saltar publicaciones y rechaza un cursor inválido | En parte |

### Resultados más recientes (26 de octubre de 2026, base local de desarrollo)

Tras aplicar las migraciones 015 y 016 a la base local:

| Ejecución | Aprobadas | Omitidas | Fallidas |
|---|---|---|---|
| Sin `TEST_DATABASE_URL` | 11 | 8 | 0 |
| Con `TEST_DATABASE_URL` | 19 | 0 | 0 |

Las 19 pruebas pasan, incluida `TestSimultaneousDuplicateReportsAreRejected`, que
necesita el índice único de la migración 015. Sin residuo: los usuarios de prueba
se borran al terminar.

**Dónde se ejecutaron.** Todas estas ejecuciones fueron contra PostgreSQL 14 en
la computadora de desarrollo. Las pruebas automatizadas **no se han ejecutado
contra Neon**. Crean y borran usuarios, por lo que no deben correrse contra la
base de producción; para validar Neon conviene usar una rama aparte.

**Verificación en Neon.** En una rama de pruebas de Neon (`gymify-testing`,
separada de producción) se aplicó la migración 016 y se comprobó con
`pg_indexes` que el índice existe con el orden esperado:

```
idx_posts_created_at_id: CREATE INDEX ... ON public.posts USING btree (created_at DESC, id DESC)
```

Esa comprobación confirma el índice del feed paginado; no sustituye correr las
pruebas de integración en esa rama.

### Ejecución anterior (misma fecha, antes de aplicar la migración 015)

| Ejecución | Aprobadas | Omitidas | Fallidas |
|---|---|---|---|
| Con `TEST_DATABASE_URL` | 17 | 1 | 0 |

Se omitió `TestSimultaneousDuplicateReportsAreRejected` porque la base local aún
no tenía la migración 015. Se conserva como registro histórico.

### Contexto de la petición

El registro de entrenamientos y el *feed* usan el contexto de la petición HTTP
(`r.Context()`) en toda la cadena hasta la base de datos: si el cliente se
desconecta o se agota el tiempo, la consulta se cancela y la transacción se
revierte. Otras partes del servidor aún usan `context.Background()` (ver
`grep -rn "context.Background()" backend/internal`); se migrarán de forma
gradual.

### Rollback del registro de entrenamientos

`CreateWorkout` guarda el entrenamiento, el XP, la racha, los logros y los
retos en **una sola transacción**. El caso de fallo se verificó a mano en un
esquema aislado (no es una prueba automática, porque exige borrar un dato del
catálogo): se retiró el logro "Primer entrenamiento" para que el paso de logros
fallara.

| Versión | Entrenamientos guardados | XP |
|---|---|---|
| Antes de la transacción | 1 | 100 |
| Con la transacción | 0 | 0 |

## 2. Pruebas manuales de los endpoints

Las pruebas funcionales de los endpoints se hicieron con `curl` durante el
desarrollo (registradas en [`sprints.md`](sprints.md)), revisando códigos de
respuesta y cuerpos. No se conserva una lista de casos ni un guion automatizado
de estas pruebas.

## 3. Pruebas de rendimiento y de estrés

Herramienta: cliente de carga propio en Go (`backend/loadtest/`), solo con la
biblioteca estándar. Cómo ejecutarlo: [`backend/loadtest/README.md`](../backend/loadtest/README.md).
Por seguridad, rechaza cualquier `-base` que no sea `localhost`, `127.0.0.1` o
`::1`, salvo que se indique `-allow-remote` para un entorno de pruebas autorizado.

**Método.** Usuarios virtuales en lazo cerrado: cada uno elige una acción, hace
la petición y espera una pausa media de 1 s. Mezcla de acciones: *feed* 25 %,
estadísticas 15 %, racha, historial, retos, *ranking* y notificaciones 10 % cada
una, y `POST /workouts` 10 %. Se mide una ventana de 30 s por etapa, tras una
rampa de 5 s. Criterio de aceptación: **p95 ≤ 1 s y menos de 1 % de errores**.

**Entorno.** Todo en una sola máquina (i7-11800H, unos 8 GB de RAM, WSL2),
PostgreSQL 14 local, servidor limitado a 1 núcleo (`taskset` y `GOMAXPROCS=1`),
500 usuarios de prueba, en un esquema aislado de la base. **No se probó contra
producción.** Los valores no son extrapolables a Render ni a Neon.

**Resultados con la configuración por omisión** (1 núcleo, *pool* de 4 conexiones):

| Usuarios virtuales | p95 | Errores | ¿Cumple? |
|---|---|---|---|
| 25 a 400 | ≈ 11 ms | 0 % | Sí |
| 800 | 562 ms (en otra corrida, 26 ms) | 0 % | Sí, cerca del límite |
| 1600 | ≈ 5 s | 0 % | No |

El rendimiento se estabiliza en unas 700 a 770 peticiones por segundo. Otras
configuraciones:

| Configuración | Usuarios | p95 |
|---|---|---|
| 1 núcleo, *pool* 4 | 1000 / 1200 | 86 ms / 1,2 s |
| 1 núcleo, *pool* 16 | 1600 | 805 ms |
| 4 núcleos, *pool* 16 | 1600 / 2400 | 57 ms / 1,75 s |

**Capacidad observada en la prueba local:** el servidor sostuvo entre 800 y 1000
*usuarios virtuales* concurrentes con la configuración por omisión, unos 1600 con
*pool* de 16 conexiones y 1600 o más con 4 núcleos. Es lo que soportó este
programa de carga en una computadora personal, con base de datos local; **no es
una cantidad garantizada de personas reales** que podrá atender la aplicación
publicada. Render y Neon tienen otros recursos y añaden latencia de red, y no se
probaron. Un usuario virtual actúa cada segundo, mucho más seguido que una
persona real.

**Otros hallazgos**
- Iniciar sesión (bcrypt) es la operación más costosa: unos 53 ms por inicio de
  sesión y unos 20 por segundo por núcleo. Con 50 simultáneos, la mediana fue de 2,6 s.
- Memoria del servidor: entre 21 y 115 MB.
- Volumen del *feed* (medido **antes** de paginarlo): 100 publicaciones, 1,3 ms y
  45 KB; 5000, 51 ms y 2,2 MB; 20 000, 330 ms y 9 MB. El *feed* ya se entrega de
  20 en 20 con paginación por cursor; esa versión no se midió de nuevo con
  volumen.
- *Ranking* con 500 usuarios: 27 ms y 81 KB.
- Cerca de la saturación hay variabilidad entre corridas.

**Pendiente.** Estas mediciones se hicieron antes de envolver el registro de
entrenamientos en una transacción y antes de paginar el *feed*; conviene repetirlas
en un entorno equivalente a producción.
