export function Resaltar({ valor, texto }) {
    const original = String(valor ?? '')
    if (!texto) return original

    const patron = new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const partes = []
    let ultimo = 0

    for (const coincidencia of original.matchAll(patron)) {
        partes.push(original.slice(ultimo, coincidencia.index))
        partes.push(<mark key={coincidencia.index}>{coincidencia[0]}</mark>)
        ultimo = coincidencia.index + coincidencia[0].length
    }
    partes.push(original.slice(ultimo))
    return <>{partes}</>
}

export const textoContador = (cantidad, texto, sinBusqueda) =>
    texto
        ? (cantidad === 1 ? `1 resultado para “${texto}”` : `${cantidad} resultados para “${texto}”`)
        : sinBusqueda
