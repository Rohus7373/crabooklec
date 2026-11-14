import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import ErrorPagina from '../components/ErrorPagina.jsx'

export function RegistroImpreso({ libros, fecha }) {
    const totalCopias = libros.reduce((total, l) => total + Number(l.N_COPIA), 0)

    return (
        <section className="registro-impreso">
            <h2>Registro de libros · CRAbook</h2>
            <p className="registro-datos">
                {fecha} · {libros.length} {libros.length === 1 ? 'título' : 'títulos'} · {totalCopias} {totalCopias === 1 ? 'copia' : 'copias'} en total
            </p>

            <table className="tabla-registro">
                <thead>
                    <tr>
                        <th scope="col">N° registro</th>
                        <th scope="col">Código de barras</th>
                        <th scope="col">Título</th>
                        <th scope="col">Autor</th>
                        <th scope="col">Editorial</th>
                        <th scope="col">Género</th>
                        <th scope="col">CDD</th>
                        <th scope="col">Copias</th>
                        <th scope="col">Disponibles</th>
                    </tr>
                </thead>
                <tbody>
                    {libros.map(l => (
                        <tr key={l.ID_LIBRO}>
                            <td>{l.N_REGISTRO}</td>
                            <td>{l.CODIGO_DE_BARRA}</td>
                            <td>{l.TITULO}</td>
                            <td>{l.AUTOR}</td>
                            <td>{l.EDITORIAL}</td>
                            <td>{l.GENERO}</td>
                            <td>{l.CDD}</td>
                            <td>{l.N_COPIA}</td>
                            <td>{l.DISPONIBLES}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}

export default function ImprimirCatalogo() {
    const [libros, setLibros] = useState(null)
    const [error, setError] = useState(false)
    const fecha = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

    useEffect(() => {
        let vigente = true
        api('/libros')
            .then(datos => {
                // Ordenados por título, de la A a la Z
                if (vigente) setLibros([...datos].sort((a, b) => String(a.TITULO).localeCompare(String(b.TITULO), 'es')))
            })
            .catch(() => { if (vigente) setError(true) })
        return () => { vigente = false }
    }, [])

    useEffect(() => {
        const antes = document.title
        document.title = `Registro de libros ${new Date().toISOString().slice(0, 10)}`
        return () => { document.title = antes }
    }, [])

    if (error) return <ErrorPagina />
    if (libros === null) return null

    return (
        <>
            <div className="cabecera-pagina no-imprimir">
                <div>
                    <h1>Imprimir catálogo</h1>
                    <p>Esta es la vista previa del registro. En la ventana de impresión elige tu impresora normal, o "Guardar como PDF" para guardarlo como archivo.</p>
                </div>
                <div>
                    <Link className="btn btn-secondary" to="/libros">Volver</Link>
                    <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
                </div>
            </div>

            <RegistroImpreso libros={libros} fecha={fecha} />
        </>
    )
}