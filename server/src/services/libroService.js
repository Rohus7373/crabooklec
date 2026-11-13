import config from '../config/config.js'
import knex from 'knex'

export class ErrorPrestamo extends Error {
    constructor(mensaje, status = 400) {
        super(mensaje)
        this.status = status
    }
}

const hoy = () => new Date().toLocaleDateString('en-CA')

export default class libroService{
    constructor(){
        this.knex = knex(config)
    }

    consultaLibros(){
        return this.knex('libro').select(
            'libro.*',
            this.knex.raw("(select count(*) from prestar where prestar.ID_LIBRO = libro.ID_LIBRO and prestar.ESTADO_LIBRO = 'Prestado') as PRESTADOS")
        )
    }
    conDisponibles(filas){
        return filas.map(l => ({
            ...l,
            DISPONIBLES: Math.max(0, (Number(l.N_COPIA) || 0) - Number(l.PRESTADOS))
        }))
    }

    async obtenerlibros(){
        const libros = await this.consultaLibros()
        return this.conDisponibles(JSON.parse(JSON.stringify(libros)))
    }
    limpiarTextos(body){
        return Object.fromEntries(
            Object.entries(body).map(([clave, valor]) => [clave, typeof valor === 'string' ? valor.trim() : valor])
        )
    }
    async storelibro(body){
        return this.knex('libro').insert(this.limpiarTextos(body))
    }
    async searchLibro(CODIGO_DE_BARRA){
        return this.knex('libro').select('*').where({ CODIGO_DE_BARRA: CODIGO_DE_BARRA}).first()
    }
    async buscarLibros(texto){
        const limpio = texto.replace(/[\\%_]/g, '\\$&')
        const like = `%${limpio}%`
        const libros = await this.consultaLibros()
            .where(qb => {
                qb.where('TITULO', 'like', like)
                  .orWhere('AUTOR', 'like', like)
                  .orWhere('CODIGO_DE_BARRA', 'like', like)
                  .orWhere('EDITORIAL', 'like', like)
                  .orWhere('GENERO', 'like', like)
                  .orWhere('CDD', 'like', like)
            })
            .orderBy('TITULO')
        return this.conDisponibles(JSON.parse(JSON.stringify(libros)))
    }
    async deleteLibro(ID_LIBRO){
        return await this.knex('libro').where({ ID_LIBRO: ID_LIBRO}).del()
    }
    async obtenerLibroPorId(ID_LIBRO){
        return this.knex('libro').select('*').where({ ID_LIBRO: ID_LIBRO}).first()
    }
    async actualizarLibro(ID_LIBRO, body){
    return this.knex('libro').where({ ID_LIBRO: ID_LIBRO }).update(this.limpiarTextos(body))
    }

    async prestamosActivos(ID_LIBRO){
        const filas = await this.knex('prestar as pre')
            .innerJoin('usuario as usu', 'pre.ID_USUARIO', 'usu.ID_USUARIO')
            .select(
                'pre.ID_PRESTAR',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                this.knex.raw("DATE_FORMAT(pre.FECHA_ENTREGA, '%d-%m-%Y') as FECHA_ENTREGA")
            )
            .where({ 'pre.ID_LIBRO': ID_LIBRO, 'pre.ESTADO_LIBRO': 'Prestado' })
            .orderBy('pre.ID_PRESTAR')
        return JSON.parse(JSON.stringify(filas))
    }

    async prestarLibro(ID_LIBRO, ID_USUARIO){
        return this.knex.transaction(async trx => {
            const libro = await trx('libro').where({ ID_LIBRO }).forUpdate().first()
            if (!libro) throw new ErrorPrestamo('Ese libro ya no existe.', 404)

            const usuario = await trx('usuario').where({ ID_USUARIO }).first()
            if (!usuario) throw new ErrorPrestamo('Esa persona no está registrada.', 404)

            const [{ total }] = await trx('prestar')
                .where({ ID_LIBRO, ESTADO_LIBRO: 'Prestado' })
                .count({ total: '*' })
            if (Number(total) >= (Number(libro.N_COPIA) || 0)) {
                throw new ErrorPrestamo('No quedan copias disponibles de este libro.', 409)
            }

            const yaLoTiene = await trx('prestar')
                .where({ ID_LIBRO, ID_USUARIO, ESTADO_LIBRO: 'Prestado' })
                .first()
            if (yaLoTiene) throw new ErrorPrestamo('Esa persona ya tiene este libro prestado.', 409)

            const [id] = await trx('prestar').insert({
                ID_USUARIO,
                ID_LIBRO,
                FECHA_ENTREGA: hoy(),
                FECHA_DEVOLUCION: null,
                ESTADO_LIBRO: 'Prestado'
            })
            return id
        })
    }

    async devolverLibro(ID_LIBRO, ID_PRESTAR){
        const actualizados = await this.knex('prestar')
            .where({ ID_PRESTAR, ID_LIBRO, ESTADO_LIBRO: 'Prestado' })
            .update({ ESTADO_LIBRO: 'Devuelto', FECHA_DEVOLUCION: hoy() })
        if (actualizados === 0) throw new ErrorPrestamo('Ese préstamo ya estaba cerrado o no existe.', 404)
    }
}
