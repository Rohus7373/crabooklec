import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ErrorPagina from '../components/ErrorPagina.jsx'

export default function Atrasados() {
    const [atrasados, setAtrasados] = useState(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let vigente = true
        api('/prestamos/atrasados')
            .then(datos => { if (vigente) setAtrasados(datos) })
            .catch(() => { if (vigente) setError(true) })
        return () => { vigente = false }
    }, [])

    if (error) return <ErrorPagina />
    if (atrasados === null) return null

    return (
        <>
            <div className="cabecera-pagina">
                <div>
                    <h1>Préstamos atrasados</h1>
                    <p>Libros que no se devolvieron dentro del plazo de 10 días hábiles, de mayor a menor atraso.</p>
                </div>
                <Link className="btn btn-secondary" to="/prestamos">Ver todos los préstamos</Link>
            </div>

            {atrasados.length > 0 ? (
                <div className="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Libro</th>
                                <th scope="col">Usuario</th>
                                <th scope="col">RUT</th>
                                <th scope="col">Rol / curso</th>
                                <th scope="col">Fecha préstamo</th>
                                <th scope="col">Debía devolverlo el</th>
                                <th scope="col">Atraso</th>
                            </tr>
                        </thead>
                        <tbody>
                            {atrasados.map(a => (
                                <tr key={a.ID_PRESTAR}>
                                    <th scope="row">{a.ID_PRESTAR}</th>
                                    <td className="col-titulo">{a.TITULO}</td>
                                    <td>{a.NOMBRE_USUARIO}</td>
                                    <td>{a.RUT_USUARIO}</td>
                                    <td>{a.ROL_USUARIO}{a.CURSO_USUARIO ? ` · ${a.CURSO_USUARIO}` : ''}</td>
                                    <td>{a.FECHA_ENTREGA}</td>
                                    <td>{a.FECHA_LIMITE}</td>
                                    <td><span className="estado estado-prestado">{a.DIAS_ATRASO} {a.DIAS_ATRASO === 1 ? 'día' : 'días'}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="estado-vacio">
                    <h2>No hay préstamos atrasados</h2>
                    <p>Todos los libros prestados están dentro del plazo de 10 días hábiles.</p>
                </div>
            )}
        </>
    )
}