import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Libros from './pages/Libros.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Prestamos from './pages/Prestamos.jsx'
import Ranking from './pages/Ranking.jsx'
import Login from './pages/Login.jsx'
import Formulario from './components/Formulario.jsx'
import { useSesion } from './context/Sesion.jsx'
import { editarLibro, editarUsuario, registrarLibro, registrarUsuario } from './formularios.js'

const enlacesAdmin = [['/libros', 'Libros'], ['/usuarios', 'Usuarios'], ['/prestamos', 'Préstamos'], ['/usuarios/ranking', 'Ranking']]
const enlacesConsulta = [['/libros', 'Libros']]

export default function App() {
    const { usuario, cargando, esAdmin, salir } = useSesion()
    const enlaces = esAdmin ? enlacesAdmin : enlacesConsulta

    // Marca en la barra la sección donde estás (gana el enlace con la ruta más larga que coincida)
    const ruta = useLocation().pathname.toLowerCase()
    const actual = enlaces
        .filter(([href]) => ruta.startsWith(href))
        .sort((a, b) => b[0].length - a[0].length)[0]?.[0]

    return (
        <>
            <header className="barra">
                <nav className="barra-interior">
                    <Link className="marca" to="/libros">
                        <img src="/img/logo.png" alt="" className="marca-logo" />
                        CRAbook
                    </Link>
                    {usuario && (
                        <>
                            <ul className="enlaces">
                                {enlaces.map(([href, texto]) => (
                                    <li key={href}>
                                        <Link to={href} aria-current={href === actual ? 'page' : undefined}>{texto}</Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="sesion">
                                <span>{usuario.nombre}</span>
                                <button type="button" className="btn-salir" onClick={salir}>Salir</button>
                            </div>
                        </>
                    )}
                </nav>
            </header>
            <main className="pagina">
                {cargando ? null : !usuario ? <Login /> : esAdmin ? <RutasAdmin /> : <RutasConsulta />}
            </main>
        </>
    )
}

// Bibliotecaria: todo
function RutasAdmin() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/libros" replace />} />
            <Route path="/login" element={<Navigate to="/libros" replace />} />
            <Route path="/libros" element={<Libros />} />
            <Route path="/libros/create" element={<Formulario key="registrar-libro" config={registrarLibro} />} />
            <Route path="/libros/editar/:id" element={<Formulario key="editar-libro" config={editarLibro} />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/usuarios/create" element={<Formulario key="registrar-usuario" config={registrarUsuario} />} />
            <Route path="/usuarios/editar/:id" element={<Formulario key="editar-usuario" config={editarUsuario} />} />
            <Route path="/usuarios/ranking" element={<Ranking />} />
            <Route path="/prestamos" element={<Prestamos />} />
            <Route path="*" element={
                <div className="estado-vacio">
                    <h2>Página no encontrada</h2>
                    <Link className="btn btn-primary" to="/libros">Volver al catálogo</Link>
                </div>
            } />
        </Routes>
    )
}

// Cuenta de consulta: solo el catálogo, sin acciones (el servidor también lo impide)
function RutasConsulta() {
    return (
        <Routes>
            <Route path="/libros" element={<Libros soloLectura />} />
            <Route path="*" element={<Navigate to="/libros" replace />} />
        </Routes>
    )
}
