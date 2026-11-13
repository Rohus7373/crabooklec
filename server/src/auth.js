import crypto from 'node:crypto'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Login: contraseñas con hash (scrypt, viene incluido en Node: no hace falta instalar nada)
// y sesión en una cookie firmada que el navegador no puede leer desde JavaScript (HttpOnly).

export const ROL_ADMIN = 'admin'        // bibliotecaria: puede hacer todo
export const ROL_CONSULTA = 'consulta'  // solo busca libros para ver qué hay disponible
export const ROLES_CUENTA = [ROL_ADMIN, ROL_CONSULTA]

const COOKIE = 'crabook_sesion'
const DURACION = 8 * 60 * 60 // la sesión dura 8 horas

// ---------- Contraseñas ----------
const COSTO = 16384, BLOQUE = 8, PARALELO = 1, LARGO = 64

const scrypt = (clave, sal, N, r, p, largo) => new Promise((resolver, rechazar) => {
    crypto.scrypt(clave, sal, largo, { N, r, p, maxmem: 64 * 1024 * 1024 }, (error, llave) => error ? rechazar(error) : resolver(llave))
})

// Resultado guardado en la base: scrypt$costo$bloque$paralelo$sal$hash (la clave nunca se guarda)
export async function hashearClave(clave) {
    const sal = crypto.randomBytes(16)
    const hash = await scrypt(clave, sal, COSTO, BLOQUE, PARALELO, LARGO)
    return ['scrypt', COSTO, BLOQUE, PARALELO, sal.toString('base64'), hash.toString('base64')].join('$')
}

// Si la cuenta no existe se compara igual contra un hash falso, para que tardar lo mismo no delate qué usuarios existen
let hashFalso
const obtenerHashFalso = () => (hashFalso ??= hashearClave(crypto.randomBytes(12).toString('hex')))

export async function verificarClave(clave, almacenado) {
    const existe = Boolean(almacenado)
    const [tipo, N, r, p, sal, hash] = String(existe ? almacenado : await obtenerHashFalso()).split('$')
    if (tipo !== 'scrypt' || !hash) return false

    const esperado = Buffer.from(hash, 'base64')
    const calculado = await scrypt(clave, Buffer.from(sal, 'base64'), Number(N), Number(r), Number(p), esperado.length)
    return crypto.timingSafeEqual(calculado, esperado) && existe
}

// ---------- Sesión ----------
let secreto
function obtenerSecreto() {
    if (secreto) return secreto

    // Mejor definir AUTH_SECRET en el .env; si no está, se crea una vez y se guarda en server/.auth-secret
    if ((process.env.AUTH_SECRET ?? '').length >= 16) return (secreto = process.env.AUTH_SECRET)

    const archivo = fileURLToPath(new URL('../.auth-secret', import.meta.url))
    try {
        const guardado = fs.readFileSync(archivo, 'utf8').trim()
        if (guardado.length >= 32) return (secreto = guardado)
    } catch { /* todavía no existe */ }

    secreto = crypto.randomBytes(48).toString('hex')
    try {
        fs.writeFileSync(archivo, secreto, { mode: 0o600 })
    } catch (error) {
        console.log(`[auth] No se pudo guardar ${archivo}: las sesiones se cerrarán cada vez que se reinicie el servidor.`)
    }
    return secreto
}

const firmar = (texto) => crypto.createHmac('sha256', obtenerSecreto()).update(texto).digest('base64url')

export function crearToken(cuenta) {
    const datos = Buffer.from(JSON.stringify({
        id: cuenta.ID_CUENTA,
        nombre: cuenta.NOMBRE_CUENTA,
        rol: cuenta.ROL_CUENTA,
        exp: Math.floor(Date.now() / 1000) + DURACION
    })).toString('base64url')
    return `${datos}.${firmar(datos)}`
}

export function leerToken(token) {
    if (!token) return null
    const [datos, firma, sobra] = String(token).split('.')
    if (!datos || !firma || sobra !== undefined) return null

    const buena = Buffer.from(firmar(datos))
    const recibida = Buffer.from(firma)
    if (buena.length !== recibida.length || !crypto.timingSafeEqual(buena, recibida)) return null

    try {
        const sesion = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'))
        if (!sesion.exp || sesion.exp < Math.floor(Date.now() / 1000)) return null
        if (!ROLES_CUENTA.includes(sesion.rol)) return null
        return { id: sesion.id, nombre: sesion.nombre, rol: sesion.rol }
    } catch {
        return null
    }
}

// ---------- Cookie ----------
const leerCookie = (req, nombre) => {
    for (const par of (req.headers.cookie ?? '').split(';')) {
        const i = par.indexOf('=')
        if (i > 0 && par.slice(0, i).trim() === nombre) {
            try { return decodeURIComponent(par.slice(i + 1).trim()) } catch { return null }
        }
    }
    return null
}

// COOKIE_SEGURA=true en el .env si algún día se usa con https
const atributos = (segundos) =>
    `Path=/; HttpOnly; SameSite=Lax; Max-Age=${segundos}${process.env.COOKIE_SEGURA === 'true' ? '; Secure' : ''}`

export const ponerSesion = (res, cuenta) => res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(crearToken(cuenta))}; ${atributos(DURACION)}`)
export const quitarSesion = (res) => res.setHeader('Set-Cookie', `${COOKIE}=; ${atributos(0)}`)

// ---------- Middlewares ----------
export function cargarSesion(req, res, next) {
    req.sesion = leerToken(leerCookie(req, COOKIE))
    next()
}

export function requiereSesion(req, res, next) {
    if (req.sesion) return next()
    res.status(401).json({ status: false, mensaje: 'Inicia sesión para continuar.' })
}

export function soloAdmin(req, res, next) {
    if (req.sesion?.rol === ROL_ADMIN) return next()
    res.status(403).json({ status: false, mensaje: 'Esta cuenta solo permite consultar el catálogo.' })
}

// Las peticiones que modifican algo deben venir como JSON (lo que envía nuestra app, no un formulario de otra página)
export function exigirJSON(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.is('application/json')) return next()
    res.status(415).json({ status: false, mensaje: 'Petición no válida.' })
}

// ---------- Límite de intentos de login ----------
const MAX_INTENTOS = 5
const BLOQUEO_MS = 5 * 60 * 1000
const intentos = new Map()

export const limiteLogin = {
    bloqueado(clave) {
        const registro = intentos.get(clave)
        return Boolean(registro && registro.hasta > Date.now() && registro.fallos >= MAX_INTENTOS)
    },
    fallo(clave) {
        const ahora = Date.now()
        if (intentos.size > 1000) for (const [k, v] of intentos) if (v.hasta < ahora) intentos.delete(k)

        const registro = intentos.get(clave)
        const vigente = registro && registro.hasta > ahora
        intentos.set(clave, { fallos: (vigente ? registro.fallos : 0) + 1, hasta: ahora + BLOQUEO_MS })
    },
    exito(clave) {
        intentos.delete(clave)
    }
}
