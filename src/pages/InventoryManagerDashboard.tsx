import React, { useState } from "react";
import { Sidebar, Topbar } from "../components";
import InventoryDashboard from "./InventoryDashboard";
import { LayoutDashboard, Package, TrendingUp, Upload } from "lucide-react";
import StoreOperations from "./StoreOperations";
import Forecasting from "./Forecasting";
import UploadReport from "./UploadReport";
import { Routes, Route } from "react-router-dom";

export default function InventoryManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        links={[
          { to: "/inventory-manager", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: "/inventory-manager/operations", label: "Store Operations", icon: <Package className="h-4 w-4" /> },
          { to: "/inventory-manager/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" /> },
          { to: "/inventory-manager/upload-report", label: "Upload Report", icon: <Upload className="h-4 w-4" /> },
        ]}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <Routes>
          <Route
            index
            element={
              <div className="flex-1 p-4 md:p-6">

                <InventoryDashboard />
              </div>
            }
          />
          <Route path="operations" element={<div className="flex-1 p-4 md:p-6"><StoreOperations /></div>} />
          <Route path="forecasting" element={<div className="flex-1 p-4 md:p-6"><Forecasting /></div>} />
          <Route path="upload-report" element={<div className="flex-1 p-4 md:p-6"><UploadReport /></div>} />
        </Routes>
      </div>
    </div>
  );
}


