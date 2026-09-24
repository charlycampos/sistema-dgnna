"""Regla pura de la nueva modalidad de asignación, sin puntos ni historial previo."""
from collections import Counter


ORDEN_NOMBRES = ("Karla Garcia", "Karol Castro", "Clara Michaud")


def decidir_asignacion(abogado_ids, eventos, complejidad_id, folios, ultimo_abogado_id=None):
    """Devuelve (abogado_id, criterio). `eventos` solo contiene la modalidad nueva."""
    if len(abogado_ids) != 3:
        raise ValueError("La modalidad requiere Karla Garcia, Karol Castro y Clara Michaud activas")
    if not eventos:
        return abogado_ids[0], "Primer registro de la nueva modalidad"

    total = Counter(e.abogadoId for e in eventos)
    por_complejidad = Counter(e.abogadoId for e in eventos if e.complejidadId == complejidad_id)
    grandes = Counter(e.abogadoId for e in eventos if e.esMayor500)
    turno = (abogado_ids.index(ultimo_abogado_id) + 1) % len(abogado_ids)

    def brecha(valores):
        return max(valores) - min(valores)

    candidatos = []
    for indice, abogado_id in enumerate(abogado_ids):
        ranking = [
            brecha([total[x] + (x == abogado_id) for x in abogado_ids]),
            brecha([por_complejidad[x] + (x == abogado_id) for x in abogado_ids]),
            brecha([grandes[x] + (x == abogado_id) for x in abogado_ids]) if folios > 500 else 0,
            (indice - turno + len(abogado_ids)) % len(abogado_ids),
        ]
        candidatos.append((ranking, abogado_id))
    candidatos.sort(key=lambda item: item[0])
    ganador = candidatos[0][0]
    empata_total = [x for x in candidatos if x[0][0] == ganador[0]]
    empata_complejidad = [x for x in empata_total if x[0][1] == ganador[1]]
    empata_volumen = [x for x in empata_complejidad if x[0][2] == ganador[2]]
    criterio = (
        "Equilibrio de cantidad total" if len(empata_total) == 1 else
        "Equilibrio de la misma complejidad jurídica" if len(empata_complejidad) == 1 else
        "Equilibrio de expedientes con más de 500 folios" if len(empata_volumen) == 1 else
        "Empate: decide el turno circular"
    )
    return candidatos[0][1], criterio
