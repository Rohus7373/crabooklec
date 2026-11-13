import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { aviso, exito } from '../dialogos.js'
import ErrorPagina from '../components/ErrorPagina.jsx'

const filtros = [['', 'Todos'], ['Prestado', 'Prestados'], ['Devuelto', 'Devueltos']]

export default function Prestamos() {
    const [params] = useSearchParams()
    const estado = params.get('estado') === 'Prestado' || params.get('estado') === 'Devuelto' ? params.get('estado') : ''
    const [prestamos, setPrestamos] = useState(null)
    const [error, setError] = useState(false)
    const [imprimiendo, setImprimiendo] = useState(null)

    useEffect(() => {
        let vigente = true
        setError(false)
        api(`/prestamos?estado=${estado}`)
            .then(datos => { if (vigente) setPrestamos(datos) })
            .catch(() => { if (vigente) setError(true) })
        return () => { vigente = false }
    }, [estado])

    // Botón "Reimprimir" de la boleta
    const reimprimir = async (p) => {
        setImprimiendo(p.ID_PRESTAR)
        try {
            await api(`/prestamos/${p.ID_PRESTAR}/boleta`, { method: 'POST' })
            exito('Boleta enviada a la impresora', 1500)
        } catch (e) {
            aviso('error', 'No se pudo imprimir', e.message)
        } finally {
            setImprimiendo(null)
        }
    }

    if (error) return <ErrorPagina />
    if (prestamos === null) return null

    return (
        <>
            <div className="cabecera-pagina">
                <div>
                    <h1>Préstamos</h1>
                    <p>Qué libro tiene cada persona, desde cuándo y si ya lo devolvió.</p>
                </div>
                <Link className="btn btn-secondary" to="/usuarios">Ver usuarios</Link>
            </div>

            <nav className="filtros" aria-label="Filtrar préstamos">
                {filtros.map(([valor, texto]) => (
                    <Link key={texto} to={valor ? `/prestamos?estado=${valor}` : '/prestamos'}
                        aria-current={estado === valor ? 'true' : undefined}>{texto}</Link>
                ))}
            </nav>

            {prestamos.length > 0 ? (
                <div className="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">#</th>
                                <th scope="col">Libro</th>
                                <th scope="col">Usuario</th>
                                <th scope="col">RUT</th>
                                <th scope="col">Fecha entrega</th>
                                <th scope="col">Fecha devolución</th>
                                <th scope="col">Estado</th>
                                <th scope="col">Boleta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prestamos.map(p => (
                                <tr key={p.ID_PRESTAR}>
                                    <th scope="row">{p.ID_PRESTAR}</th>
                                    <td className="col-titulo">{p.TITULO}</td>
                                    <td>{p.NOMBRE_USUARIO}</td>
                                    <td>{p.RUT_USUARIO}</td>
                                    <td>{p.FECHA_ENTREGA}</td>
                                    <td>{p.FECHA_DEVOLUCION}</td>
                                    <td><span className={`estado ${p.ES_PRESTADO ? 'estado-prestado' : 'estado-devuelto'}`}>{p.ESTADO_LIBRO}</span></td>
                                    <td>
                                        <button type="button" className="btn btn-secondary btn-chico btn-reimprimir"
                                            disabled={imprimiendo === p.ID_PRESTAR} onClick={() => reimprimir(p)}>Reimprimir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="estado-vacio">
                    <h2>No hay préstamos para mostrar</h2>
                    <p>Los préstamos aparecen aquí cuando prestas un libro desde el catálogo.</p>
                    <Link className="btn btn-primary" to="/libros" style={{ marginTop: '1rem' }}>Ir al catálogo</Link>
                </div>
            )}
        </>
    )
}
