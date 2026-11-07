# Habit Tracker con matriz de rendimiento

Aplicación web para llevar hábitos día a día y ver cómo vas: una matriz de cumplimiento, rachas, logros y gráficos de progreso.

Frontend: Vue 3 + Vite + axios. Backend: Node.js + Express + JWT, con SQLite en local y PostgreSQL (Neon) en producción.
En línea: https://habit-tracker-97sl.onrender.com (plan gratuito de Render: la primera carga puede tardar cerca de 50 segundos).

## Qué puedes hacer

- **Hoy:** lista de lo que toca hoy con un toque para marcarlo, notas por día, tira de los últimos 7 días, navegación a días anteriores
  (hasta 60) y aviso cuando una racha está en juego.
- **Matriz:** hábitos x días con porcentaje de cumplimiento ponderado por impacto, rachas, filtro por categoría y exportación a CSV.
  Al tocar el nombre de un hábito se abre su detalle.
- **Mis hábitos:** crear, editar, duplicar, reordenar, archivar y restaurar; buscar y filtrar por categoría; pausar con fechas
  (incluso pasadas) y quitar pausas.
- **Días fijos o meta semanal:** un hábito puede tocar días concretos o tener una meta de 1 a 7 veces por semana, cumplidas el día
  que quieras (ver abajo).
- **Progreso:** gráficos por día de la semana, por hábito, cuadrante de impacto, comparativa entre periodos y mapa de calor anual.
- **Logros:** insignias según todo tu historial.
- **Mi perfil:** nombre, clave con ojito para verla, tema, recordatorio diario del navegador, respaldo en JSON (descargar e importar),
  código de recuperación y eliminar la cuenta.
- **Administrador:** panel con totales y lista de cuentas (sin ver hábitos ni notas de nadie).

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

Requiere Node 22.5 o superior (usa `node:sqlite` y `--env-file`).

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

## Código de recuperación

Funciona siempre, con o sin correo configurado:

1. Con la sesión iniciada, en *Mi perfil > Código de recuperación*, escribe tu clave y pulsa *Generar código* (`XXXX-XXXX-XXXX`).
   Se muestra una sola vez; en la base solo queda su huella (hash). Cada código nuevo anula el anterior.
2. Si olvidas la clave, en la pantalla de entrada pulsa *¿Olvidaste tu clave?* y escribe tu correo, el código y la clave nueva.
3. El código sirve una vez: al usarlo hay que generar otro. Se permiten 5 intentos por correo cada 15 minutos.

Quien nunca generó un código y no tiene el correo configurado no puede recuperar la clave por su cuenta; un administrador puede
ponerle una clave temporal desde el panel.

## Metas semanales

Al crear un hábito se elige entre *Días fijos* y *Meta semanal* (1 a 7 veces por semana). Con meta semanal:

- La semana va de lunes a domingo y se puede cumplir cualquier día. Los días sin marcar se ven punteados ("libres").
- Si la semana termina sin llegar a la meta, se marcan como fallados tantos días como veces faltaron (los últimos libres),
  así el porcentaje se calcula igual que con días fijos. Los cumplimientos de más se marcan pero no suman.
- Si el hábito se creó a mitad de semana o estuvo en pausa, la meta baja a los días que se podían cumplir.
- La racha se cuenta en semanas seguidas cumpliendo la meta. Estos hábitos no entran en las rachas de días ni en los días perfectos
  de los logros, pero sus cumplimientos sí suman al total.

## Pruebas automáticas

    cd backend && npm test      # lógica de fechas, rachas, matriz, metas semanales, cuentas, respaldo, correo (SQLite en memoria)
    cd frontend && npm test     # lógica de las pantallas: progreso, día a día, búsqueda, pausas, recordatorio, metas semanales

Usan solo el ejecutor de pruebas de Node (`node --test`), sin instalar nada extra.
Además, GitHub las corre solas en cada push (pestaña Actions del repositorio).

## Estructura

    frontend/
      index.html, main.js, vite.config.js
      layout/        App.vue (menú + vistas), style.css (base + botones/campos)
      vistas/        Login, Hoy, Matriz, Habitos, Progreso, Logros, Perfil, Admin (+ un .css por vista)
      componentes/   MatrizCuadricula, FormularioHabito, TarjetaHabito, DetalleHabito, MapaCalor, CampoClave, gráficos...
      servicios/     api.js (axios + token), sesion.js y lógica pura probada con node --test
                     (fechas, dia, progreso, rachas, busqueda, pausas, semanal, recordatorio, restablecer...)
      tests/

    backend/src/
      server.js, app.js, db.js (SQLite o PostgreSQL con migraciones automáticas)
      middleware/    auth.js (JWT), admin.js
      rutas/         auth, habitos, registros, estadisticas, admin
      servicios/     matriz, semanal, racha, logros, respaldo, importacion, pausas, orden, archivados,
                     cuentas, recuperacion, enlaceClave, correo (SMTP sin paquetes), admin
      utils/         fechas, limitador, pausas, admin
      tests/

## API (bajo /api; todo requiere token Bearer salvo lo marcado)

| Método | Ruta                              | Función                                              |
|--------|-----------------------------------|------------------------------------------------------|
| POST   | /auth/registro                    | Crear cuenta (sin token)                             |
| POST   | /auth/login                       | Iniciar sesión, 10 intentos por correo cada 15 min (sin token) |
| GET    | /auth/yo                          | Datos de la cuenta y si es administrador             |
| GET    | /auth/correo-activo               | Si hay correo configurado (sin token)                |
| POST   | /auth/olvide                      | Enviar enlace para restablecer la clave (sin token)  |
| POST   | /auth/restablecer                 | Cambiar la clave con el enlace (sin token)           |
| POST   | /auth/recuperar                   | Cambiar la clave con el código (sin token)           |
| PUT    | /auth/perfil, /auth/clave         | Cambiar nombre o clave                               |
| POST   | /auth/codigo-recuperacion         | Generar el código de recuperación                    |
| GET    | /auth/respaldo                    | Descargar todos tus datos (JSON)                     |
| POST   | /auth/respaldo/importar           | Importar un respaldo                                 |
| POST   | /auth/cuenta/eliminar             | Eliminar la cuenta y sus datos                       |
| GET    | /habitos                          | Listar hábitos activos (con pausas)                  |
| POST   | /habitos                          | Crear hábito (días fijos o `metaSemanal`)            |
| PUT    | /habitos/:id                      | Editar hábito                                        |
| PUT    | /habitos/orden                    | Guardar el orden                                     |
| DELETE | /habitos/:id                      | Archivar (conserva el historial)                     |
| GET    | /habitos/archivados               | Listar archivados                                    |
| POST   | /habitos/:id/restaurar            | Restaurar un archivado                               |
| POST   | /habitos/:id/pausar, /reanudar    | Pausar (con fechas) y reanudar                       |
| POST   | /registros/alternar               | Marcar/desmarcar un hábito en una fecha              |
| PUT    | /registros/nota                   | Nota de un día cumplido                              |
| GET    | /estadisticas/matriz              | Matriz hábitos x días (?desde&hasta&hoy&categoria)   |
| GET    | /estadisticas/exportar            | La matriz como CSV                                   |
| GET    | /estadisticas/resumen             | Cumplimiento de 7 y 30 días                          |
| GET    | /estadisticas/logros              | Logros con su avance                                 |
| GET    | /admin/resumen, /admin/usuarios   | Solo administradores (ver arriba)                    |

## Cómo se calcula la matriz

- Estados de celda: `hecho`, `fallado`, `pendiente` (hoy sin marcar), `pausado`, `no-toca`, `futuro` y `libre` (día sin marcar de un hábito con meta semanal).
- Cumplimiento por hábito = peso de lo hecho / peso de lo que tocaba (días ya juzgables).
- Puntaje diario = lo mismo pero sumando todos los hábitos de ese día (fila inferior, mapa de calor).
- Racha: días consecutivos cumplidos contando solo los días que tocaba; hoy sin marcar no la rompe.
