import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, esAbortado } from '../api.js'
import { aviso, confirmarEliminarUsuario, exito } from '../dialogos.js'
import { Resaltar, textoContador } from '../utils.jsx'
import ErrorPagina from '../components/ErrorPagina.jsx'

export default function Usuarios() {
    const input = useRef(null)
    const [texto, setTexto] = useState('')       // lo que se está escribiendo
    const [consulta, setConsulta] = useState('')  // lo que se está buscando
    const [usuarios, setUsuarios] = useState(null)
    const [version, setVersion] = useState(0)
    const [error, setError] = useState(false)

    // Busca mientras escribes (con una pequeña pausa para no saturar la base de datos)
    useEffect(() => {
        const espera = setTimeout(() => setConsulta(texto.trim()), 250)
        return () => clearTimeout(espera)
    }, [texto])

    useEffect(() => {
        const controlador = new AbortController()
        api(`/usuarios/buscar?q=${encodeURIComponent(consulta)}`, { signal: controlador.signal })
            .then(datos => { setUsuarios(datos); setError(false) })
            .catch(e => { if (!esAbortado(e)) setError(true) })
        return () => controlador.abort()
    }, [consulta, version])

    const buscarYa = (e) => {
        e.preventDefault()
        setConsulta(texto.trim())
    }

    const limpiar = () => {
        setTexto('')
        setConsulta('')
        input.current?.focus()
    }

    const eliminar = async (u) => {
        if (!(await confirmarEliminarUsuario(u.NOMBRE_USUARIO))) return
        try {
            await api(`/usuarios/${u.ID_USUARIO}`, { method: 'DELETE' })
            await exito('Usuario eliminado', 1300)
            setVersion(v => v + 1)
        } catch (e) {
            // Con .status el servidor respondió (p. ej. tiene libros sin devolver); sin .status no hubo conexión
            if (e.status) return aviso('warning', 'No se puede eliminar', e.message)
            aviso('error', 'No se pudo eliminar', 'Revisa que el servidor esté activo.')
        }
    }

    if (error && usuarios === null) return <ErrorPagina />

    const sinUsuarios = usuarios && usuarios.length === 0

    return (
        <>
            <div className="cabecera-pagina">
                <div>
                    <h1>Usuarios</h1>
                    <p>Las personas registradas y cuántos libros tiene cada una.</p>
                </div>
                <div>
                    <Link className="btn btn-secondary" to="/prestamos">Ver préstamos</Link>
                    <Link className="btn btn-primary" to="/usuarios/create">Registrar usuario</Link>
                </div>
            </div>

            <form className="buscarUsuario ficha-busqueda" autoComplete="off" onSubmit={buscarYa}>
                <label htmlFor="buscador">¿Qué usuario buscas?</label>
                <div className="buscador-contenedor">
                    <input
                        type="search"
                        id="buscador"
                        ref={input}
                        placeholder="Nombre o RUT del usuario..."
                        autoComplete="off"
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                    />
                    {texto.trim() !== '' && (
                        <button type="button" id="limpiar-busqueda" className="btn btn-secondary" onClick={limpiar}>Limpiar</button>
                    )}
                    <button type="submit" className="btn btn-primary">Buscar</button>
                </div>
            </form>

            <p id="contador" aria-live="polite">
                {error
                    ? 'No se pudo buscar. Revisa que el servidor y la base de datos estén activos.'
                    : usuarios && textoContador(usuarios.length, consulta, `${usuarios.length} usuarios registrados`)}
            </p>

            {usuarios && !sinUsuarios && (
                <div className="tabla-contenedor">
                    <table id="tabla-usuarios">
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Nombre</th>
                                <th scope="col">RUT</th>
                                <th scope="col">Rol</th>
                                <th scope="col">Curso</th>
                                <th scope="col">Libros prestados ahora</th>
                                <th scope="col">Préstamos en total</th>
                                <th scope="col"><span className="visually-hidden">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.ID_USUARIO}>
                                    <th scope="row">{u.ID_USUARIO}</th>
                                    <td className="col-titulo"><Resaltar valor={u.NOMBRE_USUARIO} texto={consulta} /></td>
                                    <td><Resaltar valor={u.RUT_USUARIO} texto={consulta} /></td>
                                    <td>{u.ROL_USUARIO}</td>
                                    <td>{u.CURSO_USUARIO || '—'}</td>
                                    <td>{u.ACTIVOS}</td>
                                    <td>{u.TOTAL}</td>
                                    <td className="celda-acciones">
                                        <Link className="btn btn-secondary btn-chico" to={`/usuarios/editar/${u.ID_USUARIO}`}>Editar</Link>
                                        <button type="button" className="btn btn-peligro btn-chico btn-eliminar-usuario"
                                            onClick={() => eliminar(u)}>Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {sinUsuarios && (
                <div id="sin-resultados" className="estado-vacio">
                    <h2>{consulta ? 'No se encontraron usuarios' : 'Todavía no hay usuarios'}</h2>
                    <p>{consulta ? 'Intenta buscar con otro nombre o RUT.' : 'Registra a la primera persona para poder prestarle libros.'}</p>
                </div>
            )}
        </>
    )
}
