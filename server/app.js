// Debe ir primero: carga el .env antes de que se lea la configuración
import './src/cargarEnv.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import api from './src/routes/api.js'

const app = express()
app.disable('x-powered-by')
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist')

app.use(express.json())
app.use('/api', api)
app.use('/api', (req, res) => res.status(404).json({ mensaje: 'Esa ruta de la API no existe.' }))

// En producción el servidor también entrega la app de React ya compilada
if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist))
    app.get('/*splat', (req, res) => res.sendFile(path.join(dist, 'index.html')))
} else {
    app.get('/*splat', (req, res) => res.status(404).send(
        'La app de React todavía no está compilada. En desarrollo abre http://localhost:5173; ' +
        'para producción ejecuta "npm run build" dentro de la carpeta client.'
    ))
}

const puerto = process.env.PORT ?? 8085
app.listen(puerto, () => { console.log(`Listen on port ${puerto}`) })
