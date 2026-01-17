import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CEODashboard from './pages/CEODashboard'
import Login from './pages/LoginPage'
import StoreManager from './pages/StoreManagerDashboard'
import InventoryManagerDashboard from './pages/InventoryManagerDashboard'
import Profile from './pages/Profile'
import Register from './pages/RegisterPage'
import CashierTerminal from './pages/CashierTerminal'
import CashierOrders from './pages/CashierOrders'
import CustomerMyPage from './pages/CustomerMyPage'
import SelectTerminal from './pages/SelectTerminal'
import ReturnOrder from './pages/ReturnOrder'
import ReturnOrdersHistory from './pages/ReturnOrdersHistory'
import VerifyEmailPage from './pages/VerifyEmailPage'
import VerifyRegistrationPage from './pages/VerifyRegistrationPage'
import CheckEmailPage from './pages/CheckEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-registration" element={<VerifyRegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/ceo/*" element={<CEODashboard />} />
        <Route path="/store-manager/*" element={<StoreManager />} />
        <Route path="/inventory-manager/*" element={<InventoryManagerDashboard />} />
        <Route path="/cashier" element={<CashierTerminal />} />
        <Route path="/cashier/orders" element={<CashierOrders />} />
        <Route path="/cashier/return" element={<ReturnOrder />} />
        <Route path="/cashier/returns" element={<ReturnOrdersHistory />} />
        <Route path="/cashier/profile" element={<Profile />} />
        <Route path="/customer" element={<CustomerMyPage />} />
        <Route path="/select-terminal" element={<SelectTerminal />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)