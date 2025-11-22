import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "../components";
import CreateAccountForm from "../components/CreateAccountForm";
import type { CreateAccountFormData, UserRole } from "../types/user";

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine allowed roles and back path based on current route
  const isStoreManager = location.pathname.includes("/store-manager");
  const allowedRoles: UserRole[] = isStoreManager 
    ? ['CASHIER'] 
    : ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CASHIER'];
  
  const backPath = isStoreManager 
    ? "/store-manager/sessions" 
    : "/ceo/manage-accounts";
  
  const pageTitle = isStoreManager 
    ? "Create New Cashier Account" 
    : "Create New Account";
  
  const pageDescription = isStoreManager
    ? "Add a new cashier account to the system"
    : "Add a new user account to the system";

  const handleSubmit = async (data: CreateAccountFormData) => {
    try {
      // TODO: Connect to API here
      console.log("Creating account:", data);
      
      // For now, just show success and navigate back
      alert("Account created successfully!");
      navigate(backPath);
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Failed to create account. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(backPath)}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <span>←</span> {isStoreManager ? "Back to Sessions" : "Back to Manage Accounts"}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-gray-600 mt-1">{pageDescription}</p>
        </div>

        {/* Form Card */}
        <Card padded>
          <CreateAccountForm
            allowedRoles={allowedRoles}
            onSubmit={handleSubmit}
          />
        </Card>
      </div>
    </div>
  );
}
