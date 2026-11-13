import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { GRUPOS_RANKING } from '../constantes.js'
import ErrorPagina from '../components/ErrorPagina.jsx'

export default function Ranking() {
    const [params] = useSearchParams()
    const pedido = params.get('grupo') || ''
    const grupo = GRUPOS_RANKING.some(([valor]) => valor === pedido) ? pedido : ''
    const textoGrupo = GRUPOS_RANKING.find(([valor]) => valor === grupo)[1]

    const [ranking, setRanking] = useState(null)
    const [error, setError] = useState(false)

    useEffect(() => {
        let vigente = true
        setError(false)
        api(`/usuarios/ranking?grupo=${encodeURIComponent(grupo)}`)
            .then(datos => { if (vigente) setRanking(datos) })
            .catch(() => { if (vigente) setError(true) })
        return () => { vigente = false }
    }, [grupo])

    if (error) return <ErrorPagina />
    if (ranking === null) return null

    return (
        <>
            <div className="cabecera-pagina">
                <div>
                    <h1>Ranking de lectores</h1>
                    <p>Quiénes han pedido más libros, de mayor a menor.</p>
                </div>
                <Link className="btn btn-secondary" to="/usuarios">Ver usuarios</Link>
            </div>

            <nav className="filtros" aria-label="Filtrar ranking por curso">
                {GRUPOS_RANKING.map(([valor, texto]) => (
                    <Link key={texto} to={valor ? `/usuarios/ranking?grupo=${encodeURIComponent(valor)}` : '/usuarios/ranking'}
                        aria-current={grupo === valor ? 'true' : undefined}>{texto}</Link>
                ))}
            </nav>

            {ranking.length > 0 ? (
                <ol className="ranking">
                    {ranking.map(r => (
                        <li key={r.ID_USUARIO} className={`ranking-fila puesto-${r.PUESTO}`}>
                            <span className="ranking-puesto">{r.PUESTO}</span>
                            <div className="ranking-datos">
                                <strong>{r.NOMBRE_USUARIO}</strong>
                                <span>{[r.RUT_USUARIO, r.CURSO_USUARIO || r.ROL_USUARIO].join(' · ')}</span>
                            </div>
                            <div className="ranking-barra" aria-hidden="true"><span style={{ width: `${r.PORCENTAJE}%` }}></span></div>
                            <span className="ranking-total">{r.ETIQUETA}</span>
                        </li>
                    ))}
                </ol>
            ) : grupo ? (
                <div className="estado-vacio">
                    <h2>Nadie de este grupo ha pedido libros</h2>
                    <p>{textoGrupo}: todavía no hay préstamos registrados.</p>
                    <Link className="btn btn-primary" to="/usuarios/ranking" style={{ marginTop: '1rem' }}>Ver el ranking completo</Link>
                </div>
            ) : (
                <div className="estado-vacio">
                    <h2>Todavía no hay préstamos</h2>
                    <p>Cuando prestes un libro desde el catálogo, el ranking empezará a llenarse.</p>
                    <Link className="btn btn-primary" to="/libros" style={{ marginTop: '1rem' }}>Ir al catálogo</Link>
                </div>
            )}
        </>
    )
}
