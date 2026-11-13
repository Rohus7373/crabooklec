import { CURSOS, ROLES } from './constantes.js'

const campoRol = ['ROL_USUARIO', 'Rol', 'Selecciona un rol', 'select', { opciones: ROLES, requerido: true }]
const campoCurso = ['CURSO_USUARIO', 'Curso (opcional)', 'Sin curso', 'select', { opciones: CURSOS, requerido: false }]

export const registrarLibro = {
    titulo: 'Registrar libro',
    boton: 'Registrar libro',
    ruta: '/libros',
    volver: '/libros',
    requerido: true,
    campos: [
        ['CODIGO_DE_BARRA', 'Código de barras', 'ej: 0000000129127'],
        ['TITULO', 'Título', 'ej: Biblia'],
        ['AUTOR', 'Autor', 'ej: Dios'],
        ['EDITORIAL', 'Editorial', 'ej: El cielo'],
        ['GENERO', 'Género', 'ej: Religión'],
        ['N_COPIA', 'N° de copias', 'ej: 5', 'number'],
        ['CDD', 'CDD', 'ej: 220'],
        ['N_REGISTRO', 'N° de registro', 'ej: 1000', 'number']
    ],
    exito: { titulo: 'Guardado', timer: 1200 },
    errorTitulo: 'No se pudo guardar'
}

export const editarLibro = {
    titulo: 'Editar libro',
    boton: 'Guardar cambios',
    ruta: '/libros',
    volver: '/libros',
    requerido: true,
    envoltura: 'editar-libro form-tarjeta',
    campos: [
        ['CODIGO_DE_BARRA', 'Código de barras'],
        ['TITULO', 'Título'],
        ['AUTOR', 'Autor'],
        ['EDITORIAL', 'Editorial'],
        ['GENERO', 'Género'],
        ['N_COPIA', 'N° de copias', '', 'number'],
        ['CDD', 'CDD'],
        ['N_REGISTRO', 'N° de registro']
    ],
    exito: { titulo: 'Cambios guardados', texto: 'El libro se actualizó correctamente.', timer: 1500 },
    errorTitulo: 'No se pudieron guardar los cambios'
}

export const registrarUsuario = {
    titulo: 'Registrar usuario',
    boton: 'Registrar usuario',
    ruta: '/usuarios',
    volver: '/usuarios',
    requerido: false,
    campos: [
        ['NOMBRE_USUARIO', 'Nombre y Apellido', 'ej: Juanito Perez'],
        ['RUT_USUARIO', 'RUT', 'ej: 00000000-0'],
        campoRol,
        campoCurso
    ],
    exito: { titulo: 'Guardado', timer: 1200 },
    errorTitulo: 'No se pudo guardar'
}

export const editarUsuario = {
    titulo: 'Editar usuario',
    boton: 'Guardar cambios',
    ruta: '/usuarios',
    volver: '/usuarios',
    requerido: true,
    envoltura: 'form-tarjeta',
    campos: [
        ['NOMBRE_USUARIO', 'Nombre del usuario'],
        ['RUT_USUARIO', 'RUT'],
        campoRol,
        campoCurso
    ],
    exito: { titulo: 'Cambios guardados', texto: 'El usuario se actualizó correctamente.', timer: 1500 },
    errorTitulo: 'No se pudieron guardar los cambios'
}
