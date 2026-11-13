import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api.js'

// Guarda quién tiene la sesión iniciada: null = nadie, undefined = todavía comprobando
const Contexto = createContext(null)
export const useSesion = () => useContext(Contexto)

export function SesionProvider({ children }) {
    const [usuario, setUsuario] = useState(undefined)
    const [mensaje, setMensaje] = useState('')

    useEffect(() => {
        api('/sesion')
            .then(datos => setUsuario(datos.usuario))
            .catch(() => setUsuario(null))
    }, [])

    // Lo dispara api.js cuando el servidor responde 401 (sesión vencida o cerrada)
    useEffect(() => {
        const vencida = () => {
            setUsuario(actual => {
                if (actual) setMensaje('Tu sesión terminó. Vuelve a iniciar sesión.')
                return null
            })
        }
        window.addEventListener('sesion:expirada', vencida)
        return () => window.removeEventListener('sesion:expirada', vencida)
    }, [])

    const entrar = async (nombre, clave) => {
        const datos = await api('/login', { method: 'POST', body: { usuario: nombre, clave } })
        setMensaje('')
        setUsuario(datos.usuario)
    }

    const salir = async () => {
        try { await api('/logout', { method: 'POST' }) } catch { /* igual se cierra en esta pantalla */ }
        setMensaje('')
        setUsuario(null)
    }

    return (
        <Contexto.Provider value={{
            usuario,
            cargando: usuario === undefined,
            esAdmin: usuario?.rol === 'admin',
            mensaje,
            entrar,
            salir
        }}>
            {children}
        </Contexto.Provider>
    )
}
