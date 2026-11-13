import { useState } from 'react'
import { useSesion } from '../context/Sesion.jsx'

export default function Login() {
    const { entrar, mensaje } = useSesion()
    const [usuario, setUsuario] = useState('')
    const [clave, setClave] = useState('')
    const [error, setError] = useState('')
    const [enviando, setEnviando] = useState(false)

    const enviar = async (e) => {
        e.preventDefault()
        setError('')
        setEnviando(true)
        try {
            await entrar(usuario.trim(), clave)
        } catch (falla) {
            setError(falla.status ? falla.message : 'No se pudo conectar con el servidor. Revisa que esté activo.')
            setClave('')
            setEnviando(false)
        }
    }

    return (
        <form className="form-tarjeta login" onSubmit={enviar}>
            <h1>Iniciar sesión</h1>
            <p className="login-ayuda">Ingresa con la cuenta de la biblioteca.</p>

            {(error || mensaje) && <p className="login-error" role="alert">{error || mensaje}</p>}

            <div className="rejilla-campos">
                <div className="campo">
                    <label htmlFor="usuario">Usuario</label>
                    <input id="usuario" name="usuario" type="text" autoComplete="username" autoFocus required
                        maxLength={30} value={usuario} onChange={e => setUsuario(e.target.value)} />
                </div>
                <div className="campo">
                    <label htmlFor="clave">Contraseña</label>
                    <input id="clave" name="clave" type="password" autoComplete="current-password" required
                        maxLength={200} value={clave} onChange={e => setClave(e.target.value)} />
                </div>
            </div>
            <div className="acciones-formulario">
                <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
            </div>
        </form>
    )
}
