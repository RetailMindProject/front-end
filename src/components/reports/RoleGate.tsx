import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentRole } from "../../services/tokens";

// Minimal role gate: allow only CEO
export default function RoleGate({ children }: { children: React.ReactNode }) {
  const role = getCurrentRole();
  if (role !== "CEO") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}


