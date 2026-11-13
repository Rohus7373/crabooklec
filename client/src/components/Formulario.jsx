import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { aviso, exito } from '../dialogos.js'
import ErrorPagina from './ErrorPagina.jsx'

export default function Formulario({ config }) {
    const { id } = useParams()
    const navegar = useNavigate()
    const [datos, setDatos] = useState({})
    const [cargando, setCargando] = useState(Boolean(id))
    const [fallo, setFallo] = useState(false)

    useEffect(() => {
        if (!id) return
        let vigente = true
        api(`${config.ruta}/${id}`)
            .then(registro => { if (vigente) { setDatos(registro); setCargando(false) } })
            .catch(() => { if (vigente) { setFallo(true); setCargando(false) } })
        return () => { vigente = false }
    }, [id, config.ruta])

    const guardar = async (e) => {
        e.preventDefault()
        const cuerpo = Object.fromEntries(config.campos.map(([nombre]) => [nombre, datos[nombre] ?? '']))

        try {
            await api(id ? `${config.ruta}/${id}` : config.ruta, { method: id ? 'PUT' : 'POST', body: cuerpo })
            await exito(config.exito.titulo, config.exito.timer, config.exito.texto)
            navegar(config.volver)
        } catch (error) {
            aviso('error', config.errorTitulo, error.message)
        }
    }

    if (fallo) return <ErrorPagina />
    if (cargando) return null

    const contenido = (
        <>
            <div className="rejilla-campos">
                {config.campos.map(([nombre, etiqueta, placeholder, tipo = 'text', extra = {}]) => (
                    <div className="campo" key={nombre}>
                        <label htmlFor={nombre}>{etiqueta}</label>
                        {tipo === 'select' ? (
                            <select
                                id={nombre}
                                name={nombre}
                                required={extra.requerido ?? config.requerido}
                                value={datos[nombre] ?? ''}
                                onChange={e => setDatos({ ...datos, [nombre]: e.target.value })}
                            >
                                <option value="">{placeholder}</option>
                                {extra.opciones.map(opcion => <option key={opcion} value={opcion}>{opcion}</option>)}
                            </select>
                        ) : (
                            <input
                                id={nombre}
                                type={tipo}
                                name={nombre}
                                placeholder={placeholder || undefined}
                                required={extra.requerido ?? config.requerido}
                                value={datos[nombre] ?? ''}
                                onChange={e => setDatos({ ...datos, [nombre]: e.target.value })}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="acciones-formulario">
                <button type="submit" className="btn btn-primary">{config.boton}</button>
                <Link to={config.volver} className="btn btn-secondary">Cancelar</Link>
            </div>
        </>
    )

    if (config.envoltura) {
        return (
            <div className={config.envoltura}>
                <h1>{config.titulo}</h1>
                <form onSubmit={guardar}>{contenido}</form>
            </div>
        )
    }
    return (
        <form className="form-tarjeta" onSubmit={guardar}>
            <h1>{config.titulo}</h1>
            {contenido}
        </form>
    )
}
