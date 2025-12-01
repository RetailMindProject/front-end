import { useState } from "react";
import type { UserRole, EditAccountFormData, EditAccountProps } from "../types/user";

const roleLabels: Record<Exclude<UserRole, 'CEO'>, string> = {
  'CUSTOMER': 'Customer',
  'CASHIER': 'Cashier',
  'STORE_MANAGER': 'Store Manager',
  'INVENTORY_MANAGER': 'Inventory Manager',
};

export default function EditAccountForm({ allowedRoles, title, onSubmit, initialData }: EditAccountProps) {
  const [formData, setFormData] = useState<EditAccountFormData>({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    role: initialData?.role || allowedRoles[0],
    is_active: initialData?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EditAccountFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EditAccountFormData, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("EditAccountForm handleSubmit called");
    console.log("Form data:", formData);

    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }

    console.log("Validation passed, submitting...");
    setIsSubmitting(true);

    try {
      if (onSubmit) {
        console.log("Calling onSubmit with formData");
        await onSubmit(formData);
        console.log("onSubmit completed successfully");
      } else {
        // Default behavior - just log
        console.log("Edit Account:", formData);
        alert("Account updated successfully (demo mode)");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      // Re-throw to let parent handle it
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
      )}

      {/* First Name & Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => {
              setFormData({ ...formData, first_name: e.target.value });
              setErrors({ ...errors, first_name: undefined });
            }}
            className={`w-full px-4 py-2.5 text-sm rounded-lg border ${
              errors.first_name ? "border-red-500" : "border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            placeholder="Ahmad"
          />
          {errors.first_name && (
            <p className="mt-1 text-xs text-red-500">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.last_name}
            onChange={(e) => {
              setFormData({ ...formData, last_name: e.target.value });
              setErrors({ ...errors, last_name: undefined });
            }}
            className={`w-full px-4 py-2.5 text-sm rounded-lg border ${
              errors.last_name ? "border-red-500" : "border-gray-300"
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
            placeholder="Ewidat"
          />
          {errors.last_name && (
            <p className="mt-1 text-xs text-red-500">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value });
            setErrors({ ...errors, email: undefined });
          }}
          className={`w-full px-4 py-2.5 text-sm rounded-lg border ${
            errors.email ? "border-red-500" : "border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          placeholder="you@company.com"
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value });
            setErrors({ ...errors, phone: undefined });
          }}
          className={`w-full px-4 py-2.5 text-sm rounded-lg border ${
            errors.phone ? "border-red-500" : "border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
          placeholder="+970 5x xxx xxxx"
          autoComplete="tel"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.address}
          onChange={(e) => {
            setFormData({ ...formData, address: e.target.value });
            setErrors({ ...errors, address: undefined });
          }}
          rows={3}
          className={`w-full px-4 py-2.5 text-sm rounded-lg border ${
            errors.address ? "border-red-500" : "border-gray-300"
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none`}
          placeholder="Enter full address"
        />
        {errors.address && (
          <p className="mt-1 text-xs text-red-500">{errors.address}</p>
        )}
      </div>

      {/* Role - Only show if there are multiple roles to choose from */}
      {allowedRoles.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role as Exclude<UserRole, 'CEO'>]}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Is Active Toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => {
                setFormData({ ...formData, is_active: e.target.checked });
              }}
              className="sr-only"
            />
            <div
              className={`w-14 h-7 rounded-full transition-colors duration-200 ${
                formData.is_active ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                  formData.is_active ? "translate-x-7" : "translate-x-1"
                } mt-0.5`}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            Active Status
          </span>
        </label>
        <p className="mt-1 text-xs text-gray-500 ml-20">
          {formData.is_active ? "Account is active" : "Account is inactive"}
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        {isSubmitting ? "Updating Account..." : "Update Account"}
      </button>
    </form>
  );
}

