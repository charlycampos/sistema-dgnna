export function calcularPuntosExtension(folios: number): number {
    if (folios <= 500) return 1;
    if (folios <= 1000) return 2;
    if (folios <= 2000) return 3;
    return 4;
}

// Nota: Los puntos de complejidad vienen de la BD, pero podemos tener valores por defecto/fallback
// o simplemente funciones helpers si fueran estáticos. Dado que son dinámicos (BD),
// el cálculo final se hará a menudo consultando la BD.
// Pero la extensión sí es lógica pura basada en el número.
