// Acceso a la base de datos con dos motores intercambiables:
//  - SQLite (archivo local): se usa por defecto, ideal para desarrollar.
//  - PostgreSQL: se usa si existe la variable DATABASE_URL (así los datos no se pierden al publicar).
// Todas las consultas se escriben con "?" como marcador y devuelven promesas.
//
//   db.todos(sql, params)     -> arreglo de filas
//   db.uno(sql, params)       -> una fila (o undefined)
//   db.ejecutar(sql, params)  -> { cambios } filas afectadas por UPDATE / DELETE
//   db.insertar(sql, params)  -> id de la fila creada
//   db.cerrar()               -> cierra la conexión (para scripts como el seed)

const URL_PG = process.env.DATABASE_URL;

async function abrirPostgres() {
    const { default: pg } = await import('pg');
    // Los servicios gratuitos (Neon, Render...) exigen SSL; DATABASE_SSL=false lo desactiva en local
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
    const pool = new pg.Pool({ connectionString: URL_PG, ssl });

    // SQLite usa "?" y PostgreSQL usa $1, $2, ...
    const adaptar = (sql) => {
        let n = 0;
        return sql.replace(/\?/g, () => `$${++n}`);
    };

    await pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id          SERIAL PRIMARY KEY,
            nombre      TEXT NOT NULL,
            email       TEXT NOT NULL UNIQUE,
            clave_hash  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habitos (
            id          SERIAL PRIMARY KEY,
            usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            nombre      TEXT NOT NULL,
            categoria   TEXT,
            color       TEXT NOT NULL DEFAULT '#38bdf8',
            dias        TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
            peso        INTEGER NOT NULL DEFAULT 1,
            archivado   INTEGER NOT NULL DEFAULT 0,
            creado_en   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS registros (
            id          SERIAL PRIMARY KEY,
            habito_id   INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
            fecha       TEXT NOT NULL,
            nota        TEXT,
            UNIQUE (habito_id, fecha)
        );
    `);

    return {
        motor: 'postgres',
        todos: async (sql, p = []) => (await pool.query(adaptar(sql), p)).rows,
        uno: async (sql, p = []) => (await pool.query(adaptar(sql), p)).rows[0],
        ejecutar: async (sql, p = []) => ({ cambios: (await pool.query(adaptar(sql), p)).rowCount }),
        insertar: async (sql, p = []) => (await pool.query(`${adaptar(sql)} RETURNING id`, p)).rows[0].id,
        cerrar: () => pool.end()
    };
}

async function abrirSqlite() {
    const { DatabaseSync } = await import('node:sqlite');
    const sqlite = new DatabaseSync(process.env.DB_FILE || 'habit-tracker.db');
    sqlite.exec('PRAGMA journal_mode = WAL');
    sqlite.exec('PRAGMA foreign_keys = ON');

    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre      TEXT NOT NULL,
            email       TEXT NOT NULL UNIQUE,
            clave_hash  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS habitos (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            nombre      TEXT NOT NULL,
            categoria   TEXT,
            color       TEXT NOT NULL DEFAULT '#38bdf8',
            dias        TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
            peso        INTEGER NOT NULL DEFAULT 1,
            archivado   INTEGER NOT NULL DEFAULT 0,
            creado_en   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS registros (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            habito_id   INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
            fecha       TEXT NOT NULL,
            nota        TEXT,
            UNIQUE (habito_id, fecha)
        );
    `);

    // Bases de datos creadas antes de existir las notas: agrega la columna sin perder datos
    const columnas = sqlite.prepare('PRAGMA table_info(registros)').all();
    if (!columnas.some((c) => c.name === 'nota')) sqlite.exec('ALTER TABLE registros ADD COLUMN nota TEXT');

    return {
        motor: 'sqlite',
        todos: async (sql, p = []) => sqlite.prepare(sql).all(...p),
        uno: async (sql, p = []) => sqlite.prepare(sql).get(...p),
        ejecutar: async (sql, p = []) => ({ cambios: sqlite.prepare(sql).run(...p).changes }),
        insertar: async (sql, p = []) => Number(sqlite.prepare(sql).run(...p).lastInsertRowid),
        cerrar: async () => sqlite.close()
    };
}

const db = URL_PG ? await abrirPostgres() : await abrirSqlite();

export default db;
