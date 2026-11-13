import { Router } from 'express'
import libroService from '../services/libroService.js'
import usuarioService from '../services/usuarioService.js'
import prestamoService from '../services/prestamoService.js'
import cuentaService from '../services/cuentaService.js'
import {
    cargarSesion, exigirJSON, limiteLogin, ponerSesion, quitarSesion,
    requiereSesion, soloAdmin, verificarClave
} from '../auth.js'

const L = new libroService()
const U = new usuarioService()
const P = new prestamoService()
const C = new cuentaService()
const api = Router()

const falla = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status })
const existe = async (promesa) => (await promesa) || Promise.reject(falla('No se encontró el registro.', 404))
const cuerpo = (req) => req.body ?? {}

const ruta = (fn, mensajeError = 'Ocurrió un error en el servidor.') => async (req, res) => {
    try {
        res.json((await fn(req, res)) ?? { status: true })
    } catch (error) {
        if (error.status) return res.status(error.status).json({ status: false, mensaje: error.message })
        console.log(error)
        res.status(500).json({ status: false, mensaje: mensajeError })
    }
}

const datosUsuario = (req) => {
    const { NOMBRE_USUARIO, RUT_USUARIO, ROL_USUARIO } = cuerpo(req)
    if (!NOMBRE_USUARIO || !RUT_USUARIO) throw falla('Falta el nombre o el RUT.')
    if (!ROL_USUARIO) throw falla('Elige el rol del usuario.')
    return cuerpo(req)
}

api.use(cargarSesion)
api.use(exigirJSON)

api.post('/login', ruta(async (r, res) => {
    const nombre = String(cuerpo(r).usuario ?? '').trim()
    const clave = String(cuerpo(r).clave ?? '')
    if (!nombre || !clave) throw falla('Escribe tu usuario y contraseña.')

    const intento = `${r.ip}|${nombre.toLowerCase()}`
    if (limiteLogin.bloqueado(intento)) throw falla('Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.', 429)

    const cuenta = nombre.length <= 30 ? await C.buscarPorNombre(nombre) : null
    const correcta = await verificarClave(clave.slice(0, 200), cuenta?.CLAVE_HASH)
    if (!cuenta || !cuenta.ACTIVA || !correcta) {
        limiteLogin.fallo(intento)
        throw falla('Usuario o contraseña incorrectos.', 401)
    }

    limiteLogin.exito(intento)
    ponerSesion(res, cuenta)
    return { status: true, usuario: { nombre: cuenta.NOMBRE_CUENTA, rol: cuenta.ROL_CUENTA } }
}, 'No se pudo iniciar sesión.'))

api.post('/logout', (req, res) => {
    quitarSesion(res)
    res.json({ status: true })
})

api.get('/sesion', (req, res) => {
    res.json({ usuario: req.sesion ? { nombre: req.sesion.nombre, rol: req.sesion.rol } : null })
})

api.use(requiereSesion)

api.get('/libros', ruta(r => {
    const texto = String(r.query.q || '').trim()
    return texto ? L.buscarLibros(texto) : L.obtenerlibros()
}))

api.use(soloAdmin)

api.get('/libros/:id', ruta(r => existe(L.obtenerLibroPorId(r.params.id))))
api.post('/libros', ruta(async r => { await L.storelibro(cuerpo(r)) }, 'No se pudo guardar el libro.'))
api.put('/libros/:id', ruta(async r => { await L.actualizarLibro(r.params.id, cuerpo(r)) }, 'No se pudieron guardar los cambios.'))
api.delete('/libros/:id', ruta(async r => { await L.deleteLibro(r.params.id) },
    'No se pudo eliminar el libro. Es posible que tenga préstamos registrados.'))

api.get('/libros/:id/prestamos', ruta(r => L.prestamosActivos(r.params.id)))

api.post('/libros/:id/prestar', ruta(async r => {
    const { ID_USUARIO } = cuerpo(r)
    if (!ID_USUARIO) throw falla('Elige a quién le prestas el libro.')
    const ID_PRESTAR = await L.prestarLibro(r.params.id, ID_USUARIO)
    const impresion = await P.imprimirBoleta(ID_PRESTAR)
    return { status: true, ID_PRESTAR, impresion }
}))

api.post('/libros/:id/devolver', ruta(async r => {
    const { ID_PRESTAR } = cuerpo(r)
    if (!ID_PRESTAR) throw falla('Elige qué préstamo se devuelve.')
    await L.devolverLibro(r.params.id, ID_PRESTAR)
}))

api.get('/usuarios', ruta(() => U.obtenerUsuarios()))
api.get('/usuarios/lista', ruta(() => U.listaUsuarios()))
api.get('/usuarios/ranking', ruta(r => U.obtenerRanking(String(r.query.grupo || ''))))
api.get('/usuarios/buscar', ruta(r => U.buscarUsuarios(String(r.query.q || '').trim())))
api.get('/usuarios/:id', ruta(r => existe(U.obtenerUsuarioPorId(r.params.id))))
api.post('/usuarios', ruta(async r => { await U.storeUsuario(datosUsuario(r)) }, 'No se pudo guardar al usuario.'))
api.put('/usuarios/:id', ruta(async r => { await U.actualizarUsuario(r.params.id, datosUsuario(r)) }))
api.delete('/usuarios/:id', ruta(async r => { await U.eliminarUsuario(r.params.id) }))
api.get('/prestamos', ruta(r => P.obtenerPrestamos(r.query.estado)))
api.post('/prestamos/:id/boleta', async (req, res) => {
    const problema = await P.imprimirBoleta(req.params.id)
    if (problema) return res.status(502).json({ status: false, mensaje: problema })
    res.json({ status: true })
})

export default api
