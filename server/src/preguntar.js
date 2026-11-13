import readline from 'node:readline'

export function crearPreguntador() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })
    let silencio = false
    const escribir = rl._writeToOutput?.bind(rl)
    if (escribir) rl._writeToOutput = (texto) => { if (!silencio) escribir(texto) }

    const cola = []
    const espera = []
    let cerrado = false
    rl.on('line', (linea) => (espera.length ? espera.shift()(linea) : cola.push(linea)))
    rl.on('close', () => { cerrado = true; espera.splice(0).forEach(fn => fn('')) })

    const siguienteLinea = () => new Promise((resolver) => {
        if (cola.length) return resolver(cola.shift())
        if (cerrado) return resolver('')
        espera.push(resolver)
    })

    return {
        async preguntar(texto, { oculto = false } = {}) {
            process.stdout.write(texto)
            silencio = oculto
            const respuesta = await siguienteLinea()
            silencio = false
            if (oculto) process.stdout.write('\n')
            return respuesta
        },
        cerrar: () => rl.close()
    }
}
