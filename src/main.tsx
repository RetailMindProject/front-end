import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import LoginPage from './pages/LoginPage'
import StoreManager from './pages/StoreManagerDashboard'
import Register from './pages/RegisterPage'
import Sessions from './pages/Sessions'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
     <StoreManager/>
  </React.StrictMode>,
)
