import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SesionProvider } from './context/Sesion.jsx'
import './styles/base.css'
import './styles/layout.css'
import './styles/componentes.css'
import './styles/tablas.css'
import './styles/formularios.css'
import './styles/ranking.css'
import './styles/ranking.css'
import './styles/imprimir.css'

createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <SesionProvider>
            <App />
        </SesionProvider>
    </BrowserRouter>
)
