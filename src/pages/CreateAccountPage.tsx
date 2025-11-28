import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "../components";
import CreateAccountForm from "../components/CreateAccountForm";
import type { CreateAccountFormData, UserRole } from "../types/user";
import { createAccount } from "../services/auth.api";

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  // Determine allowed roles and back path based on current route
  const isStoreManager = location.pathname.includes("/store-manager");
  const allowedRoles: UserRole[] = isStoreManager 
    ? ['CASHIER'] 
    : ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CASHIER'];
  
  const backPath = isStoreManager 
    ? "/store-manager" 
    : "/ceo/manage-accounts";
  
  const pageTitle = isStoreManager 
    ? "Create New Cashier Account" 
    : "Create New Account";
  
  const pageDescription = isStoreManager
    ? "Add a new cashier account to the system"
    : "Add a new user account to the system";

  const handleSubmit = async (data: CreateAccountFormData) => {
    setError(null);

    try {
      // Validate password - must match Backend requirements
      if (!data.password || data.password.length < 8) {
        setError("Password must be at least 8 characters");
        throw new Error("Password validation failed");
      }

      // Check password complexity (at least one digit, one lowercase, one uppercase, and one special character)
      const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$/;
      if (!passwordRegex.test(data.password)) {
        setError("Password must contain at least one digit, one lowercase, one uppercase, and one special character");
        throw new Error("Password validation failed");
      }

      if (data.password !== data.confirmPassword) {
        setError("Passwords do not match");
        throw new Error("Password confirmation failed");
      }

      // Prepare request data - using camelCase to match Backend DTO
      const accountData = {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        role: data.role,
        password: data.password,
        confirmPassword: data.confirmPassword || "",
        isSelfRegistration: false, // Always false for CEO/Store Manager creating accounts
      };

      // Call API
      const result = await createAccount(accountData);

      if (result.error) {
        // Handle validation errors from backend
        if (result.error.errors) {
          const errorMessages = Object.values(result.error.errors)
            .flat()
            .join(", ");
          setError(errorMessages || result.error.message);
        } else {
          setError(result.error.message || "Failed to create account. Please try again.");
        }
        throw new Error(result.error.message || "Failed to create account");
      }

      // Success - navigate back
      navigate(backPath);
    } catch (err) {
      // If error message wasn't set yet, set it now
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      if (!error) {
        setError(errorMessage);
      }
      // Re-throw so CreateAccountForm knows submission failed and can stop loading
      throw err;
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

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
