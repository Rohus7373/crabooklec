import config from '../config/config.js'
import knex from 'knex'
import { imprimirBoleta } from '../impresora/boleta.js'

export default class prestamoService {
    constructor() {
        this.knex = knex(config)
    }

    async obtenerPrestamos(estado) {
        const consulta = this.knex('prestar as pre')
            .innerJoin('usuario as usu', 'pre.ID_USUARIO', 'usu.ID_USUARIO')
            .innerJoin('libro as lib', 'pre.ID_LIBRO', 'lib.ID_LIBRO')
            .select(
                'pre.ID_PRESTAR',
                'lib.TITULO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                this.knex.raw("DATE_FORMAT(pre.FECHA_ENTREGA, '%d-%m-%Y') as FECHA_ENTREGA"),
                this.knex.raw("DATE_FORMAT(pre.FECHA_DEVOLUCION, '%d-%m-%Y') as FECHA_DEVOLUCION"),
                'pre.ESTADO_LIBRO'
            )
            .orderBy('pre.ID_PRESTAR', 'desc')

        if (estado === 'Prestado' || estado === 'Devuelto') {
            consulta.where('pre.ESTADO_LIBRO', estado)
        }

        const filas = JSON.parse(JSON.stringify(await consulta))

        return filas.map(fila => ({
            ...fila,
            ES_PRESTADO: fila.ESTADO_LIBRO === 'Prestado'
        }))
    }

    async obtenerPrestamo(ID_PRESTAR) {
        return this.knex('prestar as pre')
            .innerJoin('usuario as usu', 'pre.ID_USUARIO', 'usu.ID_USUARIO')
            .innerJoin('libro as lib', 'pre.ID_LIBRO', 'lib.ID_LIBRO')
            .select(
                'pre.ID_PRESTAR',
                'lib.TITULO',
                'lib.AUTOR',
                'lib.CODIGO_DE_BARRA',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'pre.ESTADO_LIBRO',
                this.knex.raw("DATE_FORMAT(pre.FECHA_ENTREGA, '%d-%m-%Y') as FECHA_ENTREGA"),
                this.knex.raw("DATE_FORMAT(pre.FECHA_DEVOLUCION, '%d-%m-%Y') as FECHA_DEVOLUCION")
            )
            .where('pre.ID_PRESTAR', ID_PRESTAR)
            .first()
    }

    async imprimirBoleta(ID_PRESTAR) {
        try {
            const prestamo = await this.obtenerPrestamo(ID_PRESTAR)

            if (!prestamo) {
                return 'No se encontró el préstamo.'
            }

            await imprimirBoleta(prestamo)

            return null
        } catch (error) {
            console.log(error)
            return error.message
        }
    }
}
