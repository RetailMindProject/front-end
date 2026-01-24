import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components";
import CreateAccountForm from "../components/CreateAccountForm";
import type { CreateAccountFormData, UserRole } from "../types/user";
import { createAccount } from "../services/auth.api";
import PageHeader from "../components/PageHeader";
import { ArrowLeft } from "lucide-react";
import { getCurrentRole } from "../services/tokens";

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const currentRole = getCurrentRole();
  const isStoreManager = currentRole === "STORE_MANAGER";

  const { allowedRoles, backPath, pageTitle } = useMemo(() => {
    if (currentRole === "STORE_MANAGER") {
      return {
        allowedRoles: ["CASHIER"] as UserRole[],
        backPath: "/dashboard",
        pageTitle: "Create New Cashier Account",
      };
    }

    return {
      allowedRoles: ["STORE_MANAGER", "INVENTORY_MANAGER", "CASHIER"] as UserRole[],
      backPath: "/dashboard/manage-accounts",
      pageTitle: "Create New Account",
    };
  }, [currentRole]);

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
        <button
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200 shadow-sm mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">{isStoreManager ? "Back to Sessions" : "Back to Manage Accounts"}</span>
        </button>

        <PageHeader
          title={pageTitle}
          icon={<span className="text-2xl">➕</span>}
        />

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
