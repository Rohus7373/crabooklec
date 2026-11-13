import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, esAbortado } from '../api.js'
import { aviso, confirmarEliminarLibro, devolverLibro, prestarLibro } from '../dialogos.js'
import { Resaltar, textoContador } from '../utils.jsx'
import ErrorPagina from '../components/ErrorPagina.jsx'

export default function Libros({ soloLectura = false }) {
    const navegar = useNavigate()
    const input = useRef(null)
    const [texto, setTexto] = useState('')      
    const [consulta, setConsulta] = useState('')  
    const [libros, setLibros] = useState(null)    
    const [version, setVersion] = useState(0)    
    const [error, setError] = useState(false)
    const [activa, setActiva] = useState(null)

    const recargar = () => setVersion(v => v + 1)

    useEffect(() => {
        const espera = setTimeout(() => setConsulta(texto.trim()), 250)
        return () => clearTimeout(espera)
    }, [texto])

    useEffect(() => {
        const controlador = new AbortController()
        api(`/libros?q=${encodeURIComponent(consulta)}`, { signal: controlador.signal })
            .then(datos => { setLibros(datos); setError(false) })
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

    const eliminar = async (libro) => {
        if (!(await confirmarEliminarLibro())) return
        try {
            await api(`/libros/${libro.ID_LIBRO}`, { method: 'DELETE' })
            recargar()
        } catch (e) {
            aviso('error', 'No se pudo eliminar', e.message)
        }
    }

    const prestar = async (libro) => { if (await prestarLibro(libro, () => navegar('/usuarios/create'))) recargar() }
    const devolver = async (libro) => { if (await devolverLibro(libro)) recargar() }

    const alPresionar = (e, libro) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) setActiva(libro.ID_LIBRO)
    }

    if (error && libros === null) return <ErrorPagina />

    return (
        <>
            <div className="cabecera-pagina">
                <div>
                    <h1>Catálogo de libros</h1>
                    <p>{soloLectura
                        ? 'Busca un libro para ver cuántas copias hay disponibles.'
                        : 'Busca un libro o selecciona una fila para prestarlo o registrar su devolución.'}</p>
                </div>
                {!soloLectura && <Link className="btn btn-primary" to="/libros/create">Registrar libro</Link>}
            </div>

            <section className="ficha-busqueda">
                <form className="buscarLibro" role="search" autoComplete="off" onSubmit={buscarYa}>
                    <label htmlFor="buscador">¿Qué libro buscas?</label>
                    <div className="fila-busqueda">
                        <input
                            id="buscador"
                            ref={input}
                            type="search"
                            name="q"
                            placeholder="Título, autor, código de barras, editorial, género o CDD"
                            value={texto}
                            onChange={e => setTexto(e.target.value)}
                        />
                        {texto.trim() !== '' && (
                            <button type="button" className="btn btn-secondary" id="limpiar-busqueda" onClick={limpiar}>Limpiar</button>
                        )}
                        <button type="submit" className="btn btn-primary">Buscar</button>
                    </div>
                    <p className="contador" id="contador" aria-live="polite">
                        {error
                            ? 'No se pudo buscar. Revisa que el servidor y la base de datos estén activos.'
                            : libros && textoContador(libros.length, consulta, `${libros.length} libros en el catálogo`)}
                    </p>
                </form>
            </section>

            {libros && !(libros.length === 0 && consulta) && (
                <div className="tabla-contenedor" id="tabla-libros">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Código</th>
                                <th scope="col">Título</th>
                                <th scope="col">Autor</th>
                                <th scope="col">Editorial</th>
                                <th scope="col">Género</th>
                                <th scope="col">Copias disponibles</th>
                                <th scope="col">CDD</th>
                                <th scope="col">N° de registro</th>
                                {!soloLectura && <th scope="col"><span className="visually-hidden">Acciones</span></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {libros.map(l => (
                                <tr
                                    key={l.ID_LIBRO}
                                    className={`fila-libro${activa === l.ID_LIBRO ? ' activa' : ''}`}
                                    tabIndex={0}
                                    onClick={() => setActiva(l.ID_LIBRO)}
                                    onKeyDown={e => alPresionar(e, l)}
                                >
                                    <th scope="row">{l.ID_LIBRO}</th>
                                    <td className="col-codigo"><Resaltar valor={l.CODIGO_DE_BARRA} texto={consulta} /></td>
                                    <td className="col-titulo"><Resaltar valor={l.TITULO} texto={consulta} /></td>
                                    <td><Resaltar valor={l.AUTOR} texto={consulta} /></td>
                                    <td><Resaltar valor={l.EDITORIAL} texto={consulta} /></td>
                                    <td><Resaltar valor={l.GENERO} texto={consulta} /></td>
                                    <td className={`col-copias${l.DISPONIBLES === 0 ? ' sin-copias' : ''}`}>{l.DISPONIBLES} de {l.N_COPIA}</td>
                                    <td><Resaltar valor={l.CDD} texto={consulta} /></td>
                                    <td>{l.N_REGISTRO}</td>
                                    {!soloLectura && <td className="celda-acciones">
                                        <button type="button" className="btn btn-primary btn-chico btn-prestar acciones-extra"
                                            disabled={l.DISPONIBLES === 0} onClick={() => prestar(l)}>Prestar</button>
                                        <button type="button" className="btn btn-secondary btn-chico btn-devolver acciones-extra"
                                            onClick={() => devolver(l)}>Devolución</button>
                                        <Link className="btn btn-secondary btn-chico" to={`/libros/editar/${l.ID_LIBRO}`}>Editar</Link>
                                        <button type="button" className="btn btn-peligro btn-chico btn-eliminar"
                                            onClick={() => eliminar(l)}>Eliminar</button>
                                    </td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {libros && libros.length === 0 && consulta && (
                <div className="estado-vacio" id="sin-resultados">
                    <h2>No encontramos ese libro</h2>
                    <p>Revisa la ortografía o prueba con el autor o el código de barras.</p>
                </div>
            )}
        </>
    )
}
