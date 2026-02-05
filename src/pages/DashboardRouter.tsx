import { Navigate, Route, Routes } from "react-router-dom";
import { getCurrentRole } from "../services/tokens";
import CEODashboard from "./CEODashboard";
import StoreManagerDashboard from "./StoreManagerDashboard";
import InventoryManagerDashboard from "./InventoryManagerDashboard";
import CustomerLayout from "./CustomerLayout";
import CustomerMyPage from "./CustomerMyPage";
import CustomerOrdersPage from "./CustomerOrdersPage";
import CustomerMessageBoxPage from "./CustomerMessageBoxPage";
import CustomerSearchPage from "./CustomerSearchPage";
import MessageDetail from "./MessageDetail";
import CashierTerminal from "./CashierTerminal";
import CashierOrders from "./CashierOrders";
import ReturnOrder from "./ReturnOrder";
import ReturnOrdersHistory from "./ReturnOrdersHistory";
import Profile from "./Profile";
import SelectTerminal from "./SelectTerminal";
export default function DashboardRouter() {
  const role = getCurrentRole();

  // If no role/token, go to login
  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Customer has its own layout + subpages
  if (role === "CUSTOMER") {
    return (
      <Routes>
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<CustomerMyPage />} />
          <Route path="search" element={<CustomerSearchPage />} />
          <Route path="orders" element={<CustomerOrdersPage />} />
          <Route path="message-box" element={<CustomerMessageBoxPage />} />
          <Route path="message/:id" element={<MessageDetail />} />
        </Route>
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    );
  }

  // Cashier dashboard routes (role-neutral paths)
  if (role === "CASHIER") {
    return (
      <Routes>
        <Route index element={<CashierTerminal />} />
        <Route path="orders" element={<CashierOrders />} />
        <Route path="return" element={<ReturnOrder />} />
        <Route path="returns" element={<ReturnOrdersHistory />} />
        <Route path="select-terminal" element={<SelectTerminal />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    );
  }

  if (role === "CEO") return <CEODashboard />;
  if (role === "STORE_MANAGER") return <StoreManagerDashboard />;
  if (role === "INVENTORY_MANAGER") return <InventoryManagerDashboard />;

  return <Navigate to="/login" replace />;
}

