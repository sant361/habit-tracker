import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(process.env.DB_FILE || 'habit-tracker.db');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
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
        UNIQUE (habito_id, fecha)
    );
`);

export default db;
