import Swal from 'sweetalert2'
import { api, esAbortado } from './api.js'

const Aviso = {
    fire: (opciones) => Swal.mixin({
        confirmButtonColor: '#1f4e8c',
        cancelButtonColor: '#5a6b7d',
        cancelButtonText: 'Cancelar'
    }).fire(opciones)
}

const esc = (valor) => String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const elegir = async ({ titulo, libro, etiqueta, opciones, confirmar }) => {
    const resultado = await Aviso.fire({
        title: titulo,
        html: `
            <p>“${esc(libro)}”</p>
            <div class="swal-campo">
                <label for="swal-eleccion">${esc(etiqueta)}</label>
                <select id="swal-eleccion">
                    ${opciones.map(o => `<option value="${esc(o.valor)}">${esc(o.texto)}</option>`).join('')}
                </select>
            </div>`,
        showCancelButton: true,
        confirmButtonText: confirmar,
        focusConfirm: false,
        preConfirm: () => {
            const select = document.getElementById('swal-eleccion')
            return { valor: select.value, texto: select.selectedOptions[0].textContent }
        }
    })
    return resultado.isConfirmed ? resultado.value : null
}

const elegirUsuario = async (libro, irARegistrar) => {
    let elegido = null
    let temporizador
    let controlador

    const resultado = await Aviso.fire({
        title: 'Prestar libro',
        html: `
            <p>“${esc(libro)}”</p>
            <div class="swal-campo">
                <label for="swal-buscar-usuario">Busca por nombre o RUT</label>
                <input id="swal-buscar-usuario" type="search" autocomplete="off" placeholder="Ej: María o 12.345.678-9">
                <ul class="swal-resultados" id="swal-resultados"></ul>
                <p class="swal-elegido" id="swal-elegido" aria-live="polite">Aún no eliges a nadie</p>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Prestar',
        focusConfirm: false,
        didOpen: () => {
            const input = document.getElementById('swal-buscar-usuario')
            const lista = document.getElementById('swal-resultados')
            const etiqueta = document.getElementById('swal-elegido')

            const elegir = (usuario) => {
                elegido = usuario
                etiqueta.textContent = `Prestar a: ${usuario.NOMBRE_USUARIO} (${usuario.RUT_USUARIO})`
                lista.querySelectorAll('button').forEach(boton => {
                    boton.classList.toggle('seleccionado', boton.dataset.id === String(usuario.ID_USUARIO))
                })
                Swal.resetValidationMessage()
            }

            const pintar = (usuarios) => {
                if (usuarios.length === 0) {
                    lista.innerHTML = '<li class="swal-vacio">No hay nadie con ese nombre o RUT. <a href="/usuarios/create" id="swal-registrar">Registrar usuario</a></li>'
                    lista.querySelector('#swal-registrar').addEventListener('click', (e) => {
                        e.preventDefault()
                        Swal.close()
                        irARegistrar()
                    })
                    return
                }
                lista.innerHTML = usuarios.map(u => `
                    <li>
                        <button type="button" data-id="${esc(u.ID_USUARIO)}">
                            <strong>${esc(u.NOMBRE_USUARIO)}</strong>
                            <span>${esc(u.RUT_USUARIO)}</span>
                        </button>
                    </li>`).join('')
                lista.querySelectorAll('button').forEach((boton, i) => {
                    boton.addEventListener('click', () => elegir(usuarios[i]))
                })
            }

            const buscarUsuarios = async () => {
                controlador?.abort()
                controlador = new AbortController()
                try {
                    pintar(await api(`/usuarios/buscar?q=${encodeURIComponent(input.value.trim())}`, { signal: controlador.signal }))
                } catch (error) {
                    if (esAbortado(error)) return
                    lista.innerHTML = '<li class="swal-vacio">No se pudo buscar. Revisa que el servidor esté activo.</li>'
                }
            }

            input.addEventListener('input', () => {
                elegido = null
                etiqueta.textContent = 'Aún no eliges a nadie'
                clearTimeout(temporizador)
                temporizador = setTimeout(buscarUsuarios, 250)
            })

            input.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                lista.querySelector('button')?.click()
            })

            buscarUsuarios()
            input.focus()
        },
        willClose: () => {
            clearTimeout(temporizador)
            controlador?.abort()
        },
        preConfirm: () => {
            if (!elegido) {
                Swal.showValidationMessage('Elige a una persona de la lista')
                return false
            }
            return elegido
        }
    })
    return resultado.isConfirmed ? resultado.value : null
}

export async function prestarLibro(libro, irARegistrar) {
    const usuario = await elegirUsuario(libro.TITULO, irARegistrar)
    if (!usuario) return false

    let respuesta
    try {
        respuesta = await api(`/libros/${libro.ID_LIBRO}/prestar`, {
            method: 'POST',
            body: { ID_USUARIO: usuario.ID_USUARIO }
        })
    } catch (error) {
        await Aviso.fire({ icon: 'warning', title: 'No se pudo prestar', text: error.message || 'Inténtalo de nuevo.' })
        return false
    }

    if (respuesta.impresion) {
        await Aviso.fire({ icon: 'warning', title: 'Préstamo guardado, pero no se imprimió la boleta', text: respuesta.impresion })
    } else {
        await Aviso.fire({
            icon: 'success',
            title: 'Libro prestado',
            text: `“${libro.TITULO}” quedó a nombre de ${usuario.NOMBRE_USUARIO}.`,
            timer: 1800,
            showConfirmButton: false
        })
    }
    return true
}

export async function devolverLibro(libro) {
    let prestamos
    try {
        prestamos = await api(`/libros/${libro.ID_LIBRO}/prestamos`)
    } catch {
        await Aviso.fire({ icon: 'error', title: 'No se pudieron cargar los préstamos', text: 'Revisa que el servidor y la base de datos estén activos.' })
        return false
    }

    if (prestamos.length === 0) {
        await Aviso.fire({ icon: 'info', title: 'Este libro no está prestado', text: 'No hay ninguna devolución pendiente.' })
        return false
    }

    const eleccion = await elegir({
        titulo: 'Registrar devolución',
        libro: libro.TITULO,
        etiqueta: '¿Quién lo devuelve?',
        opciones: prestamos.map(p => ({ valor: p.ID_PRESTAR, texto: `${p.NOMBRE_USUARIO} (prestado el ${p.FECHA_ENTREGA})` })),
        confirmar: 'Registrar devolución'
    })
    if (!eleccion) return false

    try {
        await api(`/libros/${libro.ID_LIBRO}/devolver`, { method: 'POST', body: { ID_PRESTAR: eleccion.valor } })
    } catch (error) {
        await Aviso.fire({ icon: 'warning', title: 'No se pudo registrar', text: error.message || 'Inténtalo de nuevo.' })
        return false
    }

    await Aviso.fire({ icon: 'success', title: 'Devolución registrada', timer: 1500, showConfirmButton: false })
    return true
}

export async function confirmarEliminarLibro() {
    const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar libro?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    })
    return isConfirmed
}

export async function confirmarEliminarUsuario(nombre) {
    const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar usuario?',
        text: `Se eliminará a ${nombre} y se borraran todos sus registros de prestamos. Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#a63a2e',
        cancelButtonColor: '#5a6b7d'
    })
    return isConfirmed
}

export const aviso = (icon, title, text, extra = {}) =>
    Swal.fire({ icon, title, text, confirmButtonColor: '#1f4e8c', ...extra })

export const exito = (title, timer, text) =>
    Swal.fire({ icon: 'success', title, text, timer, showConfirmButton: false })
