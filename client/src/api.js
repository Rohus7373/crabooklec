// Llama a la API y lanza un Error con el mensaje del servidor si algo sale mal.
// Si el servidor respondió con error, el Error trae también .status (si no lo trae, fue un fallo de conexión).
export async function api(url, { body, ...opciones } = {}) {
    const respuesta = await fetch('/api' + url, {
        cache: 'no-cache',
        ...opciones,
        headers: { 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body)
    })
    const datos = await respuesta.json().catch(() => ({}))
    // Si la sesión venció o se cerró en otra pestaña, la app vuelve a la pantalla de login
    if (respuesta.status === 401 && url !== '/login') window.dispatchEvent(new Event('sesion:expirada'))
    if (!respuesta.ok) {
        throw Object.assign(
            new Error(datos.mensaje || `El servidor respondió con el código ${respuesta.status}`),
            { status: respuesta.status }
        )
    }
    return datos
}

export const esAbortado = (error) => error?.name === 'AbortError'
