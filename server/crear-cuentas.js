import './src/cargarEnv.js'
import { hashearClave, ROL_ADMIN, ROL_CONSULTA } from './src/auth.js'
import cuentaService from './src/services/cuentaService.js'
import { crearPreguntador } from './src/preguntar.js'

const consola = crearPreguntador()
const cuentas = new cuentaService()

async function pedirNombre(texto, prohibidos = []) {
    while (true) {
        const nombre = (await consola.preguntar(`${texto} `)).trim()
        if (nombre.length < 3 || nombre.length > 30) console.log('  Debe tener entre 3 y 30 caracteres.')
        else if (prohibidos.some(otro => otro.toLowerCase() === nombre.toLowerCase())) console.log('  Ese nombre ya lo usa la otra cuenta.')
        else return nombre
    }
}

async function pedirClave(nombre, prohibidas = []) {
    while (true) {
        const clave = await consola.preguntar(`Contraseña para "${nombre}" (mínimo 8 caracteres, no se verá al escribir): `, { oculto: true })
        if (clave.length < 8) { console.log('  Es muy corta: usa al menos 8 caracteres.'); continue }
        if (clave.length > 200) { console.log('  Es demasiado larga.'); continue }
        if (clave.toLowerCase() === nombre.toLowerCase()) { console.log('  No puede ser igual al nombre de usuario.'); continue }
        if (prohibidas.includes(clave)) { console.log('  Usa una contraseña distinta a la de la otra cuenta.'); continue }

        const repetida = await consola.preguntar('Repite la contraseña: ', { oculto: true })
        if (repetida !== clave) { console.log('  No coinciden, intenta de nuevo.'); continue }
        return clave
    }
}

try {
    console.log('\nCuenta de la Admin')
    const nombreAdmin = await pedirNombre('Nombre de Admin')
    const claveAdmin = await pedirClave(nombreAdmin)

    console.log('\nCuenta de Usuario')
    const nombreConsulta = await pedirNombre('Nombre de usuario')
    const claveConsulta = await pedirClave(nombreConsulta, [claveAdmin])

    const resultadoAdmin = await cuentas.guardarCuenta({ nombre: nombreAdmin, claveHash: await hashearClave(claveAdmin), rol: ROL_ADMIN })
    const resultadoConsulta = await cuentas.guardarCuenta({ nombre: nombreConsulta, claveHash: await hashearClave(claveConsulta), rol: ROL_CONSULTA })

    console.log(`\nListo: cuenta "${nombreAdmin}" ${resultadoAdmin} (admin) y cuenta "${nombreConsulta}" ${resultadoConsulta} (consulta).`)
} catch (error) {
    console.log(`\nNo se pudieron crear las cuentas: ${error.message}`)
    console.log('Revisa que MySQL esté iniciado y que la tabla "cuenta" exista')
    process.exitCode = 1
} finally {
    consola.cerrar()
    await cuentas.cerrar()
}
