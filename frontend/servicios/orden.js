/**
 * Mueve el elemento de la posición "indice" "delta" lugares (-1 = una antes, 1 = una después).
 * Devuelve una lista nueva; si el movimiento no es posible (extremos o índice inválido),
 * devuelve la misma lista sin tocar.
 */
export function moverElemento(lista, indice, delta) {
    const destino = indice + delta;
    if (!Number.isInteger(indice) || indice < 0 || indice >= lista.length || destino < 0 || destino >= lista.length) return lista;
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    return copia;
}
