# Gymify

**Proyecto de Graduación 2026 — Universidad del Valle de Guatemala**

- **Estudiante:** Bianca Renata Calderón Caravantes
- **Carné:** 22272
- **Carrera:** Ingeniería en Ciencias de la Computación y Tecnologías de la Información
- **Proyecto:** Desarrollo de una aplicación móvil de gamificación social para
mejorar la motivación al entrenamiento en usuarios de gimnasios en
Guatemala: Gymify

## Contenido de la entrega

| Carpeta | Contenido |
|---|---|
| [`capturas/`](capturas/) | 15 capturas de pantalla del sistema en funcionamiento |
| [`demo/demo.mp4`](demo/demo.mp4) | Video demostrativo |
| [`docs/informe_final.pdf`](docs/informe_final.pdf) | Informe final del proyecto |
| [`docs/consentimiento_firmado.pdf`](docs/consentimiento_firmado.pdf) | Consentimiento de uso de foto y video firmado |
| [`src/`](src/) | Código fuente (backend en Go, frontend en React Native + Expo, base de datos y documentación técnica) |

Variables de entorno de ejemplo: [`src/.env.example`](src/.env.example) (el mismo contenido que `src/backend/.env.example`). [`src/package.json`](src/package.json) agrupa los comandos del proyecto. Las dependencias del frontend están en [`src/frontend/package.json`](src/frontend/package.json) y las del backend en [`src/backend/go.mod`](src/backend/go.mod).

## Descripción

Gymify combina el registro de entrenamientos con elementos de gamificación y comunidad para promover la constancia y motivación de los usuarios.

El usuario registra sesiones de fuerza o cardio, mantiene una racha semanal ligada a su propia meta, gana experiencia (XP), sube de nivel, desbloquea logros y participa en retos y en un ranking. El componente social incluye un feed con publicaciones, logros compartidos, likes, comentarios, seguidores y notificaciones dentro de la app.

El prototipo se publicó en la nube y se usó en una prueba piloto con usuarios reales en octubre de 2026, distribuido como aplicación web instalable (PWA). La aplicación publicada está en <https://gymify-frontend.netlify.app>.

## Capturas y demo

Video demostrativo: [`demo/demo.mp4`](demo/demo.mp4).

<table width="100%">
<tr><td><img src="capturas/captura-01.jpg" alt="Captura 01" width="100%"></td><td><img src="capturas/captura-02.jpg" alt="Captura 02" width="100%"></td><td><img src="capturas/captura-03.jpg" alt="Captura 03" width="100%"></td></tr>
<tr><td><img src="capturas/captura-04.jpg" alt="Captura 04" width="100%"></td><td><img src="capturas/captura-05.jpg" alt="Captura 05" width="100%"></td><td><img src="capturas/captura-06.jpg" alt="Captura 06" width="100%"></td></tr>
<tr><td><img src="capturas/captura-07.jpg" alt="Captura 07" width="100%"></td><td><img src="capturas/captura-08.jpg" alt="Captura 08" width="100%"></td><td><img src="capturas/captura-09.jpg" alt="Captura 09" width="100%"></td></tr>
<tr><td><img src="capturas/captura-10.jpg" alt="Captura 10" width="100%"></td><td><img src="capturas/captura-11.jpg" alt="Captura 11" width="100%"></td><td><img src="capturas/captura-12.jpg" alt="Captura 12" width="100%"></td></tr>
<tr><td><img src="capturas/captura-13.jpg" alt="Captura 13" width="100%"></td><td><img src="capturas/captura-14.jpg" alt="Captura 14" width="100%"></td><td><img src="capturas/captura-15.jpg" alt="Captura 15" width="100%"></td></tr>
</table>

## Funcionalidades

### Entrenamiento

- Registro de sesiones de fuerza (series, repeticiones y peso) y de cardio por tiempo.
- Catálogo de ejercicios con imagen y vista previa, más ejercicios personalizados del usuario.
- Cronómetro durante la sesión.
- Registro de sesiones de hasta 3 días atrás.
- Estimación de calorías por MET y peso corporal.
- Resumen al guardar, historial, detalle, renombrado y visibilidad pública o privada de cada sesión.
- Estadísticas de entrenamiento en el perfil.

### Gamificación

- Racha semanal: cuenta las semanas consecutivas en que el usuario cumple su meta de días de entrenamiento.
- Experiencia (XP) y niveles.
- Logros desbloqueables con recompensa de XP.
- Retos con progreso automático y recompensa de XP.
- Ranking por XP con desempate por racha.
- Celebraciones animadas al subir la racha o completar un reto (desactivables).

### Comunidad

- Feed social con publicaciones propias y logros compartidos.
- Likes y comentarios; eliminación de publicaciones y comentarios propios.
- Búsqueda de usuarios, perfiles públicos, seguidores y seguidos.
- Notificaciones dentro de la app por likes, comentarios y nuevos seguidores.
- Filtro automático de lenguaje en publicaciones.
- Reporte de publicaciones y panel de moderación para administradores.

### Cuenta y seguridad

- Registro, inicio de sesión y edición de perfil.
- Contraseñas con bcrypt y sesión con JWT (HS256) de 30 días que se renueva mientras se usa la app.
- Recuperación de contraseña con código de 6 dígitos por correo (15 minutos, un solo uso).
- Límite de peticiones en los endpoints de recuperación.
- CORS restringido al frontend publicado y al entorno local.

## Estructura del repositorio

```text
src/
├── backend/            API REST en Go
│   ├── cmd/server/     Punto de entrada del servidor
│   ├── cmd/dbcheck/    Verificación de la conexión y los datos de la base
│   ├── config/         Variables de entorno
│   ├── internal/       Handlers, servicios, repositorios, middleware, mailer
│   ├── migrations/     Migraciones SQL 001–017
│   └── deploy/         Esquema y catálogos para crear una base nueva
├── frontend/           App con React Native + Expo (Android, iOS y web/PWA)
│   ├── public/         index.html, manifest.json e íconos de la PWA
│   └── src/            Pantallas, componentes, navegación y cliente de la API
├── database/           Esquema y semillas iniciales (histórico, Sprint 1–4)
└── docs/               Documentación técnica y de planificación
```

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React Native 0.74, Expo 51, react-native-web, React Navigation 6, axios, AsyncStorage |
| Backend | Go 1.25, chi 5, pgx 5 (`pgxpool`), golang-jwt 5, bcrypt |
| Base de datos | PostgreSQL (UUID como identificadores, `TIMESTAMPTZ`) |
| Correo | SMTP con STARTTLS obligatorio |

## Arquitectura general

```text
 Navegador / PWA (Netlify)          Expo Go o emulador (local)
            │                                   │
            └──────── HTTPS / JSON + JWT ───────┘
                              │
                              ▼
                  API REST en Go (Render)
                     │               │
                     ▼               ▼
        PostgreSQL (Neon)     SMTP (Brevo)
```

El frontend solo habla con la API. La API es la única que se conecta a la base de datos y al servidor de correo.

## Dónde se aloja cada parte

| Parte | Servicio | Qué contiene | Configuración clave |
|---|---|---|---|
| Frontend | [Netlify](https://www.netlify.com/) | Exportación web de Expo (`frontend/dist`) servida como PWA en `https://gymify-frontend.netlify.app` | Variable de compilación `EXPO_PUBLIC_API_URL` |
| Backend | [Render](https://render.com/) | Servicio web con el servidor de `backend/cmd/server` | Variables de entorno del backend (ver abajo) |
| Base de datos | [Neon](https://neon.tech/) (Neon Console) | PostgreSQL administrado | Cadena de conexión en `DATABASE_URL` con `sslmode=require` |
| Correo | [Brevo](https://www.brevo.com/) | Relay SMTP para los códigos de recuperación de contraseña | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` |

Las credenciales viven solo en los paneles de cada servicio y en el `.env` local, nunca en el repositorio.

Notas del plan gratuito:

- **Render** suspende el servicio tras un rato sin tráfico; la primera petición puede tardar cerca de un minuto. Por eso la app llama a `/health` al abrirse y muestra un aviso de espera (`SlowServerHint`), y el cliente usa un tiempo de espera de 90 s.
- **Render** bloquea las conexiones SMTP salientes en el plan gratuito. Si el correo no puede enviarse desde ahí, usa `PASSWORD_RESET_ENABLED=false`: los endpoints de recuperación responden 503 y el servidor arranca sin exigir SMTP.

## Cómo correr el proyecto en local

### Requisitos

- Go 1.25 o superior.
- Node.js 18 o superior y npm.
- PostgreSQL 14 o superior (local, en Docker o una rama de desarrollo en Neon) y el cliente `psql`.
- Opcional: la app Expo Go en el teléfono, o un emulador de Android o iOS.

### 1. Base de datos

Crea una base vacía. Con Docker, por ejemplo:

```bash
docker run -d --name gymify-pg \
  -e POSTGRES_USER=gymify -e POSTGRES_PASSWORD=gymify -e POSTGRES_DB=gymify \
  -p 5432:5432 postgres:16
```

Carga el esquema, los catálogos (logros, retos y ejercicios base) y las migraciones posteriores. Todas las migraciones son idempotentes, así que repetirlas no rompe nada:

```bash
cd src/backend
export DATABASE_URL='postgres://gymify:gymify@localhost:5432/gymify?sslmode=disable'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f deploy/catalogs.sql
for f in migrations/0{08,09,10,11,12,13,14,15,16,17}_*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

Para una base que ya existe, aplica solo las migraciones nuevas de `backend/migrations/` en orden.

### 2. Backend

```bash
cd src/backend
cp .env.example .env      # ajusta DATABASE_URL y las claves
go run ./cmd/dbcheck      # comprueba conexión, zona horaria y catálogos
go run ./cmd/server       # API en http://localhost:8080
```

`dbcheck` debe terminar con "Todo listo para el backend" (16 tablas, 44 ejercicios, 6 logros y 3 retos en una base nueva). Para comprobar el servidor:

```bash
curl http://localhost:8080/health
# {"service":"gymify-backend","status":"ok"}
```

Sin `SMTP_HOST`, en desarrollo los correos de recuperación se imprimen en el log del servidor.

#### Variables de entorno del backend

| Variable | Obligatoria en producción | Descripción |
|---|---|---|
| `APP_ENV` | Sí (`production`) | En `production` el servidor no arranca con claves por defecto ni sin SMTP |
| `PORT` | No | Puerto HTTP; por defecto `8080` (Render lo asigna solo) |
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL |
| `JWT_SECRET` | Sí | Clave para firmar los tokens (HS256). Genera una con `openssl rand -hex 32` |
| `PASSWORD_RESET_SECRET` | Sí, si la recuperación está activa | Clave HMAC para proteger los códigos de recuperación |
| `PASSWORD_RESET_ENABLED` | No | `false` desactiva la recuperación de contraseña (503) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` | Sí, si la recuperación está activa | Servidor SMTP; debe soportar STARTTLS |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes web permitidos, separados por comas. Vacío = Netlify y `http://localhost:8081` |
| `APP_TIMEZONE` | No | Zona horaria de la racha; por defecto `America/Guatemala` |

### 3. Frontend

```bash
cd src/frontend
npm install
npm start          # menú de Expo: w = web, a = Android, i = iOS, QR = Expo Go
```

También puedes abrir una plataforma directamente:

```bash
npm run web        # navegador en http://localhost:8081
npm run android    # emulador de Android
npm run ios        # simulador de iOS (solo macOS)
```

Sin `EXPO_PUBLIC_API_URL`, la app usa el backend local: `http://localhost:8080/api/v1` en web e iOS, y `http://10.0.2.2:8080/api/v1` en el emulador de Android. En un teléfono físico con Expo Go, `localhost` apunta al propio teléfono; usa la IP de tu computadora en la red:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080/api/v1 npm start
```

Las variables `EXPO_PUBLIC_*` quedan incrustadas en el código público de la app. Nunca pongas secretos en ellas.

## Cómo se publica

### Base de datos (Neon)

1. Crea el proyecto en Neon Console y copia la cadena de conexión (incluye `sslmode=require`).
2. Carga el esquema con los mismos comandos de la sección "Base de datos", usando esa cadena en `DATABASE_URL`.
3. Comprueba la base desde tu computadora sin tocar `.env`:

   ```bash
   cd src/backend
   DATABASE_URL='postgresql://…neon.tech/…?sslmode=require' go run ./cmd/dbcheck
   ```

### Backend (Render)

Servicio web conectado al repositorio de GitHub:

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `go build -o bin/server ./cmd/server` |
| Start Command | `./bin/server` |
| Health Check Path | `/health` |

Variables: `APP_ENV=production`, `DATABASE_URL` (Neon), `JWT_SECRET`, `PASSWORD_RESET_SECRET`, las de SMTP (Brevo) o `PASSWORD_RESET_ENABLED=false`, y `CORS_ALLOWED_ORIGINS` si el frontend cambia de dominio.

### Correo (Brevo)

En Brevo, en la sección SMTP & API, genera una clave SMTP y configura:

```text
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=<usuario SMTP de Brevo>
SMTP_PASSWORD=<clave SMTP de Brevo>
SMTP_FROM=Gymify <remitente verificado en Brevo>
```

El remitente de `SMTP_FROM` debe estar verificado en Brevo. El backend exige STARTTLS: si el servidor no lo ofrece, el envío falla y la contraseña nunca viaja en claro.

### Frontend (Netlify)

| Campo | Valor |
|---|---|
| Base directory | `frontend` |
| Build command | `npx expo export --platform web` |
| Publish directory | `frontend/dist` |
| Variable de entorno | `EXPO_PUBLIC_API_URL=https://<servicio>.onrender.com/api/v1` |

Para generar la misma versión en local:

```bash
cd src/frontend
EXPO_PUBLIC_API_URL=https://<servicio>.onrender.com/api/v1 npx expo export --platform web
# resultado en frontend/dist
```

`frontend/public/manifest.json` (modo `standalone`, íconos y colores) y las etiquetas `apple-mobile-web-app-*` de `frontend/public/index.html` hacen que la página se instale como app desde "Agregar a pantalla de inicio" en Safari (iOS) o Chrome (Android). La PWA no tiene *service worker*: necesita conexión y no recibe notificaciones push.

## Pruebas

```bash
cd src/backend
go test ./...
```

Las pruebas cubren el cálculo de la racha semanal, la validación de ejercicios personalizados, el envío de correo con STARTTLS, la moderación, el registro atómico de entrenamientos y la paginación del feed. Las de integración se activan con `TEST_DATABASE_URL` y solo deben usarse contra una base de desarrollo. Los endpoints se probaron manualmente con `curl` y el rendimiento con un cliente de carga propio (`backend/loadtest/`). Herramientas, método y resultados: [`src/docs/testing.md`](src/docs/testing.md).

## Documentación

- [`src/docs/api-design.md`](src/docs/api-design.md): endpoints de la API REST.
- [`src/docs/testing.md`](src/docs/testing.md): pruebas automatizadas, manuales y de rendimiento, con sus resultados.
- [`src/docs/database-design.md`](src/docs/database-design.md): modelo y diccionario de datos.
- [`src/docs/gamification-design.md`](src/docs/gamification-design.md): reglas de racha, XP, niveles, logros, retos y ranking.
- [`src/docs/product-backlog.md`](src/docs/product-backlog.md): backlog y estado de las historias de usuario.
- [`src/docs/user-stories.md`](src/docs/user-stories.md): historias de usuario y criterios de aceptación.
- [`src/docs/sprints.md`](src/docs/sprints.md): planificación, ejecución y ajustes de los sprints.

## Equipo

- Bianca Renata Calderón Caravantes — 22272

## Contexto académico

Proyecto desarrollado como Trabajo Profesional y de graduación en la Universidad del Valle de Guatemala.
