export async function api(url, { body, ...opciones } = {}) {
    const respuesta = await fetch('/api' + url, {
        cache: 'no-cache',
        ...opciones,
        headers: { 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body)
    })
    const datos = await respuesta.json().catch(() => ({}))
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
