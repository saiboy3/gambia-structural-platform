import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './context/UserContext'
import { ProjectProvider } from './context/ProjectContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </UserProvider>
  </StrictMode>,
)
