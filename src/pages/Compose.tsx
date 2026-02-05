import ComposeMessagePage from "./ComposeMessagePage";
import { getCurrentRole } from "../services/tokens";

export default function Compose() {
  // Different recipient options for Compose vs Upload Report based on role
  let recipientOptions: { value: string; label: string }[];
  
  const role = getCurrentRole();

  if (role === "CEO") {
    // CEO can send to Store Manager and Inventory Manager
    recipientOptions = [
      { value: "store_manager", label: "Store Manager" },
      { value: "inventory_manager", label: "Inventory Manager" },
    ];
  } else if (role === "STORE_MANAGER") {
    // Store Manager can send to all roles
    recipientOptions = [
      { value: "ceo", label: "CEO" },
      { value: "inventory_manager", label: "Inventory Manager" },
    ];
  } else if (role === "INVENTORY_MANAGER") {
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

  return <ComposeMessagePage recipients={recipientOptions} />;
}

