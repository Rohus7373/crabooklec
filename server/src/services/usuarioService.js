import config from '../config/config.js'
import knex from 'knex'
import { CURSOS, GRUPO_PERSONAL, ROLES, ROLES_PERSONAL } from '../constantes.js'

export class ErrorUsuario extends Error {
    constructor(mensaje, status = 400) {
        super(mensaje)
        this.status = status
    }
}

function datosUsuario(body) {
    const NOMBRE_USUARIO = String(body.NOMBRE_USUARIO ?? '').trim()
    const RUT_USUARIO = String(body.RUT_USUARIO ?? '').trim()
    const ROL_USUARIO = String(body.ROL_USUARIO ?? '').trim()
    const CURSO_USUARIO = String(body.CURSO_USUARIO ?? '').trim() || null

    if (!NOMBRE_USUARIO || !RUT_USUARIO) {
        throw new ErrorUsuario('Falta el nombre o el RUT.')
    }
    if (!ROL_USUARIO) {
        throw new ErrorUsuario('Elige el rol del usuario.')
    }
    if (!ROLES.includes(ROL_USUARIO)) {
        throw new ErrorUsuario('Ese rol no es válido.')
    }
    if (CURSO_USUARIO && !CURSOS.includes(CURSO_USUARIO)) {
        throw new ErrorUsuario('Ese curso no es válido.')
    }

    return { NOMBRE_USUARIO, RUT_USUARIO, CURSO_USUARIO, ROL_USUARIO }
}

export default class usuarioService {
    constructor() {
        this.knex = knex(config)
    }

    async obtenerUsuarios() {
        const usuarios = await this.knex('usuario as usu')
            .leftJoin('prestar as pre', 'usu.ID_USUARIO', 'pre.ID_USUARIO')
            .select(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .count({ TOTAL: 'pre.ID_PRESTAR' })
            .select(
                this.knex.raw(
                    "COALESCE(SUM(pre.ESTADO_LIBRO = 'Prestado'), 0) as ACTIVOS"
                )
            )
            .groupBy(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .orderBy('usu.NOMBRE_USUARIO')

        return JSON.parse(JSON.stringify(usuarios)).map(u => ({
            ...u,
            TOTAL: Number(u.TOTAL),
            ACTIVOS: Number(u.ACTIVOS)
        }))
    }

    async listaUsuarios() {
        const usuarios = await this.knex('usuario')
            .select(
                'ID_USUARIO',
                'NOMBRE_USUARIO',
                'RUT_USUARIO',
                'CURSO_USUARIO',
                'ROL_USUARIO'
            )
            .orderBy('NOMBRE_USUARIO')

        return JSON.parse(JSON.stringify(usuarios))
    }

    async buscarUsuarios(texto) {

        if (!texto) {
            return this.obtenerUsuarios()
        }

        const escapar = (valor) =>
            valor.replace(/[\\%_]/g, '\\$&')

        const porNombre = `%${escapar(texto)}%`

        const rutLimpio = escapar(
            texto.replace(/[.\-\s]/g, '')
        )

        const usuarios = await this.knex('usuario as usu')
            .leftJoin('prestar as pre', 'usu.ID_USUARIO', 'pre.ID_USUARIO')
            .select(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .count({ TOTAL: 'pre.ID_PRESTAR' })
            .select(
                this.knex.raw(
                    "COALESCE(SUM(pre.ESTADO_LIBRO = 'Prestado'), 0) as ACTIVOS"
                )
            )
            .where(qb => {
                qb.where('usu.NOMBRE_USUARIO', 'like', porNombre)

                if (rutLimpio) {
                    qb.orWhereRaw(
                        "REPLACE(REPLACE(usu.RUT_USUARIO, '.', ''), '-', '') LIKE ?",
                        [`%${rutLimpio}%`]
                    )
                }
            })
            .groupBy(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .orderBy('usu.NOMBRE_USUARIO')
            .limit(8)

        return JSON.parse(JSON.stringify(usuarios)).map(u => ({
            ...u,
            TOTAL: Number(u.TOTAL),
            ACTIVOS: Number(u.ACTIVOS)
        }))
    }

    async obtenerUsuarioPorId(ID_USUARIO) {
        return this.knex('usuario')
            .where({ ID_USUARIO })
            .first()
    }

    async actualizarUsuario(ID_USUARIO, body) {
        const actualizados = await this.knex('usuario')
            .where({ ID_USUARIO })
            .update(datosUsuario(body))

        if (actualizados === 0) {
            throw new ErrorUsuario('Ese usuario ya no existe.', 404)
        }
    }

    async eliminarUsuario(ID_USUARIO) {
        return this.knex.transaction(async trx => {
            const usuario = await trx('usuario')
                .where({ ID_USUARIO })
                .first()

            if (!usuario) {
                throw new ErrorUsuario('Ese usuario ya no existe.', 404)
            }

            const [{ activos }] = await trx('prestar')
                .where({
                    ID_USUARIO,
                    ESTADO_LIBRO: 'Prestado'
                })
                .count({ activos: '*' })

            if (Number(activos) > 0) {
                const libros = Number(activos) === 1
                    ? 'libro'
                    : 'libros'

                throw new ErrorUsuario(
                    `${usuario.NOMBRE_USUARIO} tiene ${activos} ${libros} sin devolver. Registra la devolución antes de eliminarlo.`,
                    409
                )
            }

            await trx('prestar')
                .where({ ID_USUARIO })
                .del()

            await trx('usuario')
                .where({ ID_USUARIO })
                .del()
        })
    }

    async storeUsuario(body) {
        return this.knex('usuario').insert(datosUsuario(body))
    }

    async obtenerRanking(grupo) {
        const consulta = this.knex('usuario as usu')
            .innerJoin('prestar as pre', 'usu.ID_USUARIO', 'pre.ID_USUARIO')
            .select(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .count({ TOTAL: 'pre.ID_PRESTAR' })
            .groupBy(
                'usu.ID_USUARIO',
                'usu.NOMBRE_USUARIO',
                'usu.RUT_USUARIO',
                'usu.CURSO_USUARIO',
                'usu.ROL_USUARIO'
            )
            .orderBy('TOTAL', 'desc')
            .orderBy('usu.NOMBRE_USUARIO')

        if (grupo === GRUPO_PERSONAL) {
            consulta.whereIn('usu.ROL_USUARIO', ROLES_PERSONAL)
        } else if (CURSOS.includes(grupo)) {
            consulta.where('usu.CURSO_USUARIO', grupo)
        }

        const filas = await consulta

        const maximo = filas.length
            ? Number(filas[0].TOTAL)
            : 0

        let puesto = 0
        let anterior = null

        return filas.map((fila, i) => {
            const total = Number(fila.TOTAL)

            if (total !== anterior) {
                puesto = i + 1
                anterior = total
            }

            return {
                ID_USUARIO: fila.ID_USUARIO,
                NOMBRE_USUARIO: fila.NOMBRE_USUARIO,
                RUT_USUARIO: fila.RUT_USUARIO,
                CURSO_USUARIO: fila.CURSO_USUARIO,
                ROL_USUARIO: fila.ROL_USUARIO,
                TOTAL: total,
                ETIQUETA: `${total} ${total === 1 ? 'libro' : 'libros'}`,
                PUESTO: puesto,
                PORCENTAJE: maximo
                    ? Math.round((total / maximo) * 100)
                    : 0
            }
        })
    }
}
