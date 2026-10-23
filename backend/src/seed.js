// Carga un usuario demo con 45 días de historial para probar la matriz.
// Uso:  npm run seed
// Se puede repetir cuando quieras: borra y vuelve a crear solo el usuario demo.
import bcrypt from 'bcryptjs';
import db from './db.js';
import { hoyLocal, sumarDias, rangoDias, diaSemana } from './utils/fechas.js';

const DIAS_HISTORIAL = 45;
const EMAIL = 'demo@habittracker.com';
const CLAVE = 'demo1234';

// Generador pseudoaleatorio con semilla fija: siempre produce el mismo historial
function crearAleatorio(semilla) {
    let s = semilla;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

// tasa = probabilidad de cumplir un día que toca; rachaFinal = días seguidos cumplidos hasta ayer
const habitosDemo = [
    { nombre: 'Entrenar', categoria: 'Salud', color: '#2f7d5b', dias: [1, 2, 3, 4, 5], peso: 5, tasa: 0.8 },
    { nombre: 'Leer 20 minutos', categoria: 'Estudio', color: '#6366f1', dias: [0, 1, 2, 3, 4, 5, 6], peso: 3, tasa: 0.65 },
    { nombre: 'Tomar 2 litros de agua', categoria: 'Salud', color: '#0ea5e9', dias: [0, 1, 2, 3, 4, 5, 6], peso: 2, tasa: 0.9 },
    { nombre: 'Meditar', categoria: 'Bienestar', color: '#f59e0b', dias: [0, 1, 2, 3, 4, 5, 6], peso: 2, tasa: 0.45 },
    { nombre: 'Practicar programación', categoria: 'Estudio', color: '#ec4899', dias: [1, 2, 3, 4, 5], peso: 4, tasa: 0.7, rachaFinal: 8 }
];

// Notas de ejemplo para algunos días cumplidos (generador aparte para no alterar el historial)
const NOTAS = {
    'Entrenar': ['Pecho y tríceps', 'Pierna, quedé agotado', 'Rutina corta, poco tiempo'],
    'Leer 20 minutos': ['Capítulo 3', 'Libro nuevo, buen comienzo'],
    'Meditar': ['Costó concentrarme', 'Muy tranquilo hoy'],
    'Practicar programación': ['Terminé el ejercicio de arrays', 'Repasé promesas en JavaScript']
};

const hoy = hoyLocal();
const inicio = sumarDias(hoy, -(DIAS_HISTORIAL - 1));
const ayer = sumarDias(hoy, -1);
const aleatorio = crearAleatorio(2026);
const aleatorioNotas = crearAleatorio(7);

try {
    // Borrar el usuario demo anterior (sus hábitos y registros se borran en cascada)
    await db.ejecutar('DELETE FROM usuarios WHERE email = ?', [EMAIL]);

    const usuarioId = await db.insertar('INSERT INTO usuarios (nombre, email, clave_hash) VALUES (?, ?, ?)', [
        'Usuario Demo',
        EMAIL,
        bcrypt.hashSync(CLAVE, 10)
    ]);

    let totalRegistros = 0;
    for (const h of habitosDemo) {
        const habitoId = await db.insertar(
            `INSERT INTO habitos (usuario_id, nombre, categoria, color, dias, peso, creado_en)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [usuarioId, h.nombre, h.categoria, h.color, JSON.stringify(h.dias), h.peso, inicio]
        );

        // Se llena hasta ayer; el día de hoy queda pendiente para poder marcarlo en la demo
        for (const fecha of rangoDias(inicio, ayer)) {
            if (!h.dias.includes(diaSemana(fecha))) continue;
            const forzado = h.rachaFinal && fecha >= sumarDias(hoy, -h.rachaFinal);
            const cumplido = aleatorio() < h.tasa;
            if (forzado || cumplido) {
                const frases = NOTAS[h.nombre] || [];
                const nota = frases.length && aleatorioNotas() < 0.15 ? frases[Math.floor(aleatorioNotas() * frases.length)] : null;
                await db.insertar('INSERT INTO registros (habito_id, fecha, nota) VALUES (?, ?, ?)', [habitoId, fecha, nota]);
                totalRegistros++;
            }
        }
    }

    console.log(`Listo: ${habitosDemo.length} hábitos y ${totalRegistros} registros de ${DIAS_HISTORIAL} días.`);
    console.log(`Entra con  ${EMAIL}  /  ${CLAVE}`);
} catch (error) {
    console.error('No se pudieron cargar los datos de ejemplo:', error.message);
    process.exitCode = 1;
} finally {
    await db.cerrar();
}
