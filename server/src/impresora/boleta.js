
import net from 'node:net'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'

const COLUMNAS = 32
const ESC = 0x1b
const GS = 0x1d

const CP850 = {
    'á': 0xa0, 'é': 0x82, 'í': 0xa1, 'ó': 0xa2, 'ú': 0xa3, 'ñ': 0xa4, 'Ñ': 0xa5,
    '¿': 0xa8, '¡': 0xad, 'ü': 0x81, 'Ü': 0x9a, 'Á': 0xb5, 'É': 0x90, 'Í': 0xd6,
    'Ó': 0xe0, 'Ú': 0xe9, '°': 0xf8
}

const sinTildes = (texto) =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function codificar(texto) {
    const limpio = process.env.IMPRESORA_SIN_TILDES === 'true'
        ? sinTildes(texto)
        : texto

    return Buffer.from([...limpio].map(c =>
        CP850[c] ?? (c.charCodeAt(0) < 128 ? c.charCodeAt(0) : 0x3f)
    ))
}

function calcularFechaDevolucion(fechaPrestamo) {
    if (!fechaPrestamo) {
        throw new Error('No se recibió la fecha del préstamo.')
    }

    let fecha

    if (fechaPrestamo instanceof Date) {
        fecha = new Date(fechaPrestamo)
    } else {
        const valor = String(fechaPrestamo).trim()

        if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            const [anio, mes, dia] = valor.split('-').map(Number)
            fecha = new Date(anio, mes - 1, dia)
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
            const [dia, mes, anio] = valor.split('/').map(Number)
            fecha = new Date(anio, mes - 1, dia)
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
            const [dia, mes, anio] = valor.split('-').map(Number)
            fecha = new Date(anio, mes - 1, dia)
        } else {
            throw new Error(`Formato de fecha no reconocido: ${valor}`)
        }
    }

    if (Number.isNaN(fecha.getTime())) {
        throw new Error('La fecha del préstamo no es válida.')
    }

    fecha.setDate(fecha.getDate() + 7)

    return fecha.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function envolver(texto, ancho = COLUMNAS) {
    const lineas = []

    for (const parrafo of String(texto ?? '').split('\n')) {
        let actual = ''

        for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
            let resto = palabra

            while (resto.length > ancho) {
                if (actual) {
                    lineas.push(actual)
                    actual = ''
                }

                lineas.push(resto.slice(0, ancho))
                resto = resto.slice(ancho)
            }

            if (!actual) actual = resto
            else if ((actual + ' ' + resto).length <= ancho) {
                actual += ' ' + resto
            } else {
                lineas.push(actual)
                actual = resto
            }
        }

        lineas.push(actual)
    }

    return lineas
}

function codigoBarras(valor) {
    const codigo = String(valor ?? '').trim()

    if (!codigo) {
        throw new Error('El código de barras está vacío.')
    }

    if (!/^[\x20-\x7E]+$/.test(codigo)) {
        throw new Error('El código de barras contiene caracteres no válidos para CODE128.')
    }

    const bytes = Buffer.from(codigo, 'ascii')

    if (bytes.length > 250) {
        throw new Error('El código de barras es demasiado largo.')
    }

    const partes = []

    partes.push(Buffer.from([ESC, 0x61, 1]))
    partes.push(Buffer.from([GS, 0x68, 80]))
    partes.push(Buffer.from([GS, 0x77, 2]))
    partes.push(Buffer.from([GS, 0x48, 2]))

    partes.push(Buffer.from([
        GS, 0x6b, 0x49, bytes.length
    ]))

    partes.push(bytes)
    partes.push(Buffer.from([0x0a]))
    partes.push(Buffer.from([ESC, 0x61, 0]))

    return Buffer.concat(partes)
}

export function armarBoleta(p) {
    console.log('FECHA RECIBIDA:', p.FECHA_ENTREGA)
    console.log('FECHA DEVOLUCIÓN:', p.FECHA_DEVOLUCION)
    console.log('ESTADO:', p.ESTADO_LIBRO)

    const partes = []

    const fechaDevolucion = p.ESTADO_LIBRO === 'Devuelto'
        ? p.FECHA_DEVOLUCION
        : calcularFechaDevolucion(p.FECHA_ENTREGA)

    const cmd = (...bytes) => partes.push(Buffer.from(bytes))

    const linea = (texto = '') =>
        partes.push(codificar(texto), Buffer.from([0x0a]))

    const lineas = (texto) =>
        envolver(texto).forEach(l => linea(l))

    const separador = () =>
        linea('-'.repeat(COLUMNAS))

    const dato = (titulo, valor) => {
        cmd(ESC, 0x45, 1)
        linea(titulo)
        cmd(ESC, 0x45, 0)
        lineas(valor)
    }

    cmd(ESC, 0x40)

    cmd(
        ESC,
        0x74,
        Number(process.env.IMPRESORA_CODEPAGE ?? 2)
    )

    cmd(ESC, 0x61, 1)
    cmd(GS, 0x21, 0x11)
    cmd(ESC, 0x45, 1)

    linea('CRAbook')

    cmd(GS, 0x21, 0x00)
    cmd(ESC, 0x45, 0)

    linea('Boleta de préstamo')
    linea(`N° ${p.ID_PRESTAR}`)

    cmd(ESC, 0x61, 0)

    separador()

    dato('Fecha préstamo:', p.FECHA_ENTREGA)

    dato(
        p.ESTADO_LIBRO === 'Devuelto'
            ? 'Fecha de devolución:'
            : 'Devolver antes del:',
        fechaDevolucion || 'Sin fecha registrada'
    )

    dato('Libro:', p.TITULO)
    dato('Autor:', p.AUTOR)

    cmd(ESC, 0x45, 1)
    linea('Código de barras:')
    cmd(ESC, 0x45, 0)

    partes.push(codigoBarras(p.CODIGO_DE_BARRA))

    separador()

    dato('Prestado a:', p.NOMBRE_USUARIO)
    dato('RUT:', p.RUT_USUARIO)

    separador()

    cmd(ESC, 0x61, 1)

    lineas('Conserve esta boleta.\nRecuerde devolver el libro.\nAsí nos gusta el LEC!!')

    cmd(ESC, 0x64, 5)

    return Buffer.concat(partes)
}

//solo se usa si se configuro para que funcionara por red/cable ethernet 
function enviarPorRed(datos) {
    return new Promise((resolve, reject) => {
        const socket = net.createConnection({
            host: process.env.IMPRESORA_HOST,
            port: Number(process.env.IMPRESORA_PUERTO ?? 9100)
        })

        let terminado = false

        const fallar = (error) => {
            if (terminado) return
            terminado = true
            socket.destroy()
            reject(error)
        }

        socket.setTimeout(5000, () => {
            fallar(new Error('La impresora no responde (tiempo agotado).'))
        })

        socket.on('error', e => {
            fallar(new Error(
                `No se pudo conectar con la impresora: ${e.message}`
            ))
        })

        socket.on('connect', () => {
            socket.end(datos)
        })

        socket.on('close', conError => {
            if (terminado) return
            terminado = true

            if (!conError) resolve()
            else reject(new Error('La conexión con la impresora se cerró inesperadamente.'))
        })
    })
}

async function enviarLocal(datos) {
    const destino = process.env.IMPRESORA_DESTINO

    if (!destino) {
        throw new Error('Falta IMPRESORA_DESTINO en el archivo .env.')
    }

    if (process.platform !== 'win32') {
        return fs.writeFile(destino, datos)
    }

    const archivo = path.join(
        os.tmpdir(),
        `boleta-${Date.now()}.bin`
    )

    await fs.writeFile(archivo, datos)

    try {
        await new Promise((resolve, reject) => {
            execFile(
                'cmd',
                ['/c', 'copy', '/b', archivo, destino],
                (error, salida, stderr) => {
                    const resultado = String(salida ?? '') +
                        String(stderr ?? '')

                    if (error || !/\b1\b/.test(resultado)) {
                        return reject(
                            new Error(
                                `No se pudo enviar a la impresora (${destino}). ${resultado.trim()}`
                            )
                        )
                    }

                    resolve()
                }
            )
        })
    } finally {
        fs.unlink(archivo).catch(() => {})
    }
}

export async function imprimirBoleta(prestamo) {
    const tipo = process.env.IMPRESORA_TIPO

    if (!tipo) {
        throw new Error(
            'La impresora no está configurada (revisa IMPRESORA_TIPO en el archivo .env).'
        )
    }

    const datos = armarBoleta(prestamo)

    if (tipo === 'red') {
        return enviarPorRed(datos)
    }

    if (tipo === 'local') {
        return enviarLocal(datos)
    }

    throw new Error(
        'IMPRESORA_TIPO debe ser "red" o "local".'
    )
}
