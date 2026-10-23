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
