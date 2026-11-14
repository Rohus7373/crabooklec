export const PLAZO_DIAS_HABILES = 10
export const FERIADOS = []

const clave = (fecha) =>
    `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

const esHabil = (fecha) => fecha.getDay() !== 0 && fecha.getDay() !== 6 && !FERIADOS.includes(clave(fecha))

export function sumarDiasHabiles(desde, dias = PLAZO_DIAS_HABILES) {
    const fecha = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
    let faltan = dias
    while (faltan > 0) {
        fecha.setDate(fecha.getDate() + 1)
        if (esHabil(fecha)) faltan--
    }
    return fecha
}

export function leerFecha(texto) {
    const valor = String(texto ?? '').trim()
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(valor)
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    return null
}

export const formatoFecha = (fecha) =>
    fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })