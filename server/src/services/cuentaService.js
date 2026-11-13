import config from '../config/config.js'
import knex from 'knex'

export default class cuentaService {
    constructor() {
        this.knex = knex(config)
    }

    async buscarPorNombre(NOMBRE_CUENTA) {
        return this.knex('cuenta').where({ NOMBRE_CUENTA }).first()
    }

    async guardarCuenta({ nombre, claveHash, rol, ID_USUARIO = null }) {
        const existente = await this.buscarPorNombre(nombre)
        if (existente) {
            await this.knex('cuenta')
                .where({ ID_CUENTA: existente.ID_CUENTA })
                .update({ CLAVE_HASH: claveHash, ROL_CUENTA: rol, ID_USUARIO, ACTIVA: 1 })
            return 'actualizada'
        }
        await this.knex('cuenta').insert({
            NOMBRE_CUENTA: nombre,
            CLAVE_HASH: claveHash,
            ROL_CUENTA: rol,
            ID_USUARIO,
            ACTIVA: 1
        })
        return 'creada'
    }

    async cerrar() {
        await this.knex.destroy()
    }
}
