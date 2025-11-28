import { useLocation } from "react-router-dom";
import UploadReport from "./UploadReport";

export default function Compose() {
  const { pathname } = useLocation();
  
  // Different recipient options for Compose vs Upload Report based on role
  let recipientOptions: { value: string; label: string }[];
  
  if (pathname.startsWith("/ceo")) {
    // CEO can send to Store Manager and Inventory Manager
    recipientOptions = [
      { value: "store_manager", label: "Store Manager" },
      { value: "inventory_manager", label: "Inventory Manager" },
    ];
  } else if (pathname.startsWith("/store-manager")) {
    // Store Manager can send to all roles
    recipientOptions = [
      { value: "ceo", label: "CEO" },
      { value: "inventory_manager", label: "Inventory Manager" },
    ];
  } else if (pathname.startsWith("/inventory-manager")) {
    // Inventory Manager can send to Store Manager and CEO
    recipientOptions = [
      { value: "store_manager", label: "Store Manager" },
      { value: "ceo", label: "CEO" },
    ];
  } else {
    // Default fallback
    recipientOptions = [
      { value: "ceo", label: "CEO" },
      { value: "inventory_manager", label: "Inventory Manager" },
      { value: "store_manager", label: "Store Manager" },
    ];
  }

  return <UploadReport recipients={recipientOptions} />;
}

