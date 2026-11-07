# Habit Tracker con matriz de rendimiento

Frontend: Vue 3 + Vite + axios (misma estructura que `portafolio-vue`).
Backend: Node.js + Express + SQLite (node:sqlite) + JWT.

## Cómo correrlo

Terminal 1 (backend):

    cd backend
    cp .env.example .env
    npm install
    npm run dev          # http://localhost:3000

Terminal 2 (frontend):

    cd frontend
    npm install
    npm run dev          # http://localhost:5173  (reenvía /api al backend)

Requiere Node 20.6 o superior (usa `--env-file`).

## Publicarlo en internet (Render)

El repo incluye `render.yaml`: un solo servicio web que compila el frontend y lo sirve junto con la API.

1. Entra a https://render.com e inicia sesión con GitHub.
2. New + > Blueprint, elige el repositorio `habit-tracker` y confirma.
3. Render genera `JWT_SECRET` solo; al terminar te da una dirección `https://...onrender.com`.

### Base de datos que no se borra

En Render gratis el disco se borra en cada reinicio, así que el archivo SQLite no sirve para publicar.
Si defines la variable `DATABASE_URL`, la app usa PostgreSQL y los datos se conservan:

1. Crea una cuenta gratis en https://neon.tech y un proyecto nuevo.
2. Copia la dirección de conexión (empieza con `postgresql://`).
3. En Render, en tu servicio, ve a Environment y pega esa dirección en `DATABASE_URL`.
4. Guarda; Render vuelve a desplegar y las tablas se crean solas.

Para cargar el usuario de ejemplo en esa base: `cd backend`, define `DATABASE_URL` en tu `.env` y corre `npm run seed`.
Sin `DATABASE_URL` todo sigue funcionando con SQLite, como en desarrollo.

## Administrador

Define la variable `ADMIN_EMAIL` con el correo de **una cuenta que ya hayas registrado tú** (en Render, en *Environment*;
en local, en `backend/.env`). Se pueden poner varios separados por comas. Esa cuenta puede usar `/api/admin`:

- `GET /api/admin/resumen`: cuántas cuentas, hábitos y registros hay y cuántas cuentas estuvieron activas en 7 días.
- `GET /api/admin/usuarios`: cada cuenta con cuántos hábitos y registros tiene y su última actividad.
- `DELETE /api/admin/usuarios/:id`: elimina una cuenta y sus datos.
- `POST /api/admin/usuarios/:id/clave`: pone una clave temporal (se muestra una sola vez) a quien olvidó la suya.

El panel nunca muestra los hábitos ni las notas de nadie, y no puede borrar ni cambiar la clave de otra cuenta de administrador.
Sin `ADMIN_EMAIL` no existen administradores. No pongas un correo que nadie haya registrado todavía: cualquiera podría
registrarlo y quedar como admin.

## Recuperar la clave por correo (Gmail)

Si configuras un correo de Gmail, en el inicio de sesión aparece la opción de recibir un enlace para cambiar la clave.
El enlace sirve una sola vez y vence a los 30 minutos. Sin esta configuración la página sigue funcionando y solo
ofrece el código de recuperación del perfil.

1. En la cuenta de Google que enviará los correos activa la verificación en dos pasos y crea una **contraseña de aplicación**
   (myaccount.google.com/apppasswords). La clave normal de Gmail no sirve.
2. Define estas variables (en Render, en *Environment*; en local, en `backend/.env`):
   - `GMAIL_USER`: el correo de Gmail que envía.
   - `GMAIL_APP_PASSWORD`: la contraseña de aplicación (con o sin espacios).
   - `APP_URL` (opcional): la dirección de la página, por ejemplo `https://habit-tracker-97sl.onrender.com`. Si falta, se toma de la petición.
3. Opcional, para otro proveedor SMTP: `SMTP_HOST`, `SMTP_PORT` y `SMTP_SEGURO` (`false` si el puerto no usa TLS directo).

Límites: 3 correos por cuenta cada 15 minutos y 30 en total por hora. La respuesta es la misma exista o no el correo,
para que nadie pueda averiguar quién está registrado.

## Pausar un hábito

En *Mis hábitos*, el botón **Pausar** (con fecha final opcional) deja el hábito en pausa: durante esos días
no cuenta para el porcentaje, no rompe la racha y se ve rayado en la matriz. **Reanudar** la termina a partir de hoy.
Un día en pausa que igual se cumple sí cuenta. Cada hábito puede tener varias pausas, pero no dos que se crucen.

## Recuperar la clave

La app no envía correos, así que la recuperación usa un **código de recuperación** (formato `XXXX-XXXX-XXXX`):

1. Con la sesión iniciada, en *Mi perfil > Código de recuperación*, escribe tu clave y pulsa *Generar código*.
   Se muestra una sola vez; en la base solo queda su huella (hash). Cada código nuevo anula el anterior.
2. Si olvidas la clave, en la pantalla de entrada pulsa *¿Olvidaste tu clave?* y escribe tu correo, el código y la clave nueva.
3. El código sirve una vez: al usarlo hay que generar otro. Se permiten 5 intentos por correo cada 15 minutos.

Quien nunca generó un código no puede recuperar la clave por esta vía.

## Pruebas automáticas

    cd backend && npm test      # fechas, rachas, CSV y la matriz (con SQLite en memoria)
    cd frontend && npm test     # gráficos de progreso y cuadrante de impacto

Usan solo el ejecutor de pruebas de Node (`node --test`), sin instalar nada extra.
Además, GitHub las corre solas en cada push (pestaña Actions del repositorio).

## Estructura

    frontend/
      index.html, main.js, vite.config.js
      layout/        App.vue (menú + vistas), style.css (base del portafolio + botones/campos)
      vistas/        Login, Matriz, Habitos, Perfil (+ un .css por vista con su .tema-xxx)
      componentes/   MatrizCuadricula, SelectorPeriodo, FormularioHabito, TarjetaHabito
      servicios/     api.js (axios + token), sesion.js, fechas.js

    backend/src/
      server.js, app.js, db.js
      middleware/    auth.js (JWT)
      rutas/         auth, habitos, registros, estadisticas
      servicios/     matriz.js (cálculo de la matriz), racha.js
      utils/         fechas.js

## API (todas bajo /api, excepto auth requieren token Bearer)

| Método | Ruta                          | Función                                   |
|--------|-------------------------------|-------------------------------------------|
| POST   | /auth/registro                | Crear cuenta                              |
| POST   | /auth/login                   | Iniciar sesión                            |
| GET    | /habitos                      | Listar hábitos activos                    |
| POST   | /habitos                      | Crear hábito                              |
| PUT    | /habitos/:id                  | Editar hábito                             |
| DELETE | /habitos/:id                  | Archivar hábito (conserva el historial)   |
| POST   | /registros/alternar           | Marcar/desmarcar hábito en una fecha      |
| GET    | /estadisticas/matriz          | Matriz hábitos x días (?desde&hasta&hoy)  |
| GET    | /estadisticas/resumen         | Cumplimiento de 7 y 30 días               |

## Cómo se calcula la matriz

- Estados de celda: `hecho`, `fallado`, `pendiente` (hoy sin marcar), `no-toca`, `futuro`.
- Cumplimiento por hábito = peso de lo hecho / peso de lo que tocaba (días ya juzgables).
- Puntaje diario = lo mismo pero sumando todos los hábitos de ese día (fila inferior, mapa de calor).
- Racha: días consecutivos cumplidos contando solo los días que tocaba; hoy sin marcar no la rompe.
