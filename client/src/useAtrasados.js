import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import { api } from './api.js'

export function useAtrasados(activo) {
    const [cantidad, setCantidad] = useState(0)
    const avisado = useRef(false)

    useEffect(() => {
        if (!activo) {
            setCantidad(0)
            avisado.current = false
            return
        }

        let vigente = true
        const cargar = () => api('/prestamos/atrasados')
            .then(lista => {
                if (!vigente) return
                setCantidad(lista.length)

                if (lista.length > 0 && !avisado.current) {
                    avisado.current = true
                    Swal.fire({
                        toast: true,
                        position: 'bottom-end',
                        icon: 'warning',
                        title: lista.length === 1
                            ? 'Hay 1 préstamo con el plazo vencido'
                            : `Hay ${lista.length} préstamos con el plazo vencido`,
                        showConfirmButton: false,
                        timer: 6000,
                        timerProgressBar: true
                    })
                }
            })
            .catch(() => { /* si falla, se vuelve a intentar en la próxima actualización */ })

        cargar()
        const cada5Minutos = setInterval(cargar, 5 * 60 * 1000)
        window.addEventListener('datos:cambiaron', cargar)

        return () => {
            vigente = false
            clearInterval(cada5Minutos)
            window.removeEventListener('datos:cambiaron', cargar)
        }
    }, [activo])

    return cantidad
}