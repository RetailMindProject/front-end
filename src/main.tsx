import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import HomePage from './pages/HomePage'
import Login from './pages/LoginPage'
import DocsPage from './pages/DocsPage'
import Profile from './pages/Profile'
import Register from './pages/RegisterPage'
import SelectTerminal from './pages/SelectTerminal'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifyRegistrationPage from './pages/VerifyRegistrationPage'
import CheckEmailPage from './pages/CheckEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardRouter from './pages/DashboardRouter'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/docs/:feature" element={<DocsPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/verify-registration" element={<VerifyRegistrationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Role-neutral app entry */}
          <Route path="/dashboard/*" element={<DashboardRouter />} />

          {/* Legacy role URLs (redirect to /dashboard) */}
          <Route path="/ceo/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/store-manager/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/inventory-manager/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/cashier/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/customer/*" element={<Navigate to="/dashboard" replace />} />

          {/* Legacy standalone routes */}
          <Route path="/select-terminal" element={<SelectTerminal />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)