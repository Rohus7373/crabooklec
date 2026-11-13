import { Link } from 'react-router-dom'

// Lo mismo que mostraba antes la vista "error"
export default function ErrorPagina() {
    return (
        <div className="estado-vacio">
            <h2>No se ha podido cargar la página</h2>
            <p>Los datos no existen o hubo un problema con el servidor. Inténtalo de nuevo o vuelve al catálogo.</p>
            <Link className="btn btn-primary" to="/libros" style={{ marginTop: '1rem' }}>Volver al catálogo</Link>
        </div>
    )
}
