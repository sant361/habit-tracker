// Express 4 no captura los errores de los manejadores async por sí solo.
// Este envoltorio los manda al manejador de errores general en vez de dejar la petición colgada.
export const asincrono = (manejador) => (req, res, next) => Promise.resolve(manejador(req, res, next)).catch(next);
