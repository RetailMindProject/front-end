import React from "react";
import { useLocation, Navigate } from "react-router-dom";

// Minimal role gate: allow only CEO (we infer CEO context by /ceo path since shared auth not available)
export default function RoleGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isCeoContext = pathname.startsWith("/ceo");
  if (!isCeoContext) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}


