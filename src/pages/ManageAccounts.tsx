import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card } from "../components";
import AccountsTable from "../components/accounts/AccountsTable";
import AccountsFilters from "../components/accounts/AccountsFilters";
import AccountModal from "../components/accounts/AccountModal";
import type { UserAccount, UserRole } from "../types/user";
import { getAllAccounts, updateAccount } from "../services/auth.api";
import type { EditAccountFormData } from "../types/user";

export default function ManageAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  useEffect(() => {
    let isMounted = true;

    const loadAccounts = async () => {
      setLoading(true);
      setError(null);

      const result = await getAllAccounts();

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setError(result.error.message || "Failed to load accounts");
        setAccounts([]);
      } else if (result.data) {
        setAccounts(result.data);
      }

      setLoading(false);
    };

    loadAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = searchTerm === '' || 
        account.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'ALL' || account.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && account.is_active) ||
        (statusFilter === 'INACTIVE' && !account.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, searchTerm, roleFilter, statusFilter]);

  const handleEdit = async (data: EditAccountFormData) => {
    if (!editingAccount) {
      console.error("No editing account found");
      return;
    }
    
    console.log("handleEdit called with data:", data);
    console.log("Editing account ID:", editingAccount.id);
    
    setError(null);
    
    try {
      // Convert EditAccountFormData to UpdateAccountRequest format
      const updateData = {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        role: data.role,
        isActive: data.is_active,
      };

      console.log("Calling updateAccount with:", updateData);
      const result = await updateAccount(editingAccount.id, updateData);
      console.log("updateAccount result:", result);

      if (result.error) {
        console.error("Update account error:", result.error);
        setError(result.error.message || "Failed to update account");
        // Don't throw here, just show error and keep modal open
        return;
      }

      if (!result.data) {
        console.error("No data in response");
        setError("No data received from server");
        return;
      }

      console.log("Update successful, updating local state");
      // Update local state with the updated account from API response
      const updatedAccount = result.data;
      setAccounts(accounts.map(acc => 
        acc.id === editingAccount.id 
          ? { 
              ...acc, 
              first_name: updatedAccount.firstName,
              last_name: updatedAccount.lastName,
              email: updatedAccount.email,
              phone: updatedAccount.phone,
              address: updatedAccount.address,
              role: updatedAccount.role.toUpperCase() as UserRole,
              is_active: updatedAccount.isActive,
              updated_at: updatedAccount.updatedAt
            }
          : acc
      ));
      
      console.log("Closing modal");
      setShowEditModal(false);
      setEditingAccount(null);
    } catch (err) {
      console.error("Exception in handleEdit:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  const handleToggleStatus = async (id: string) => {
    const account = accounts.find(acc => acc.id === id);
    if (!account) {
      console.error("Account not found for toggle:", id);
      return;
    }

    const newStatus = !account.is_active;
    console.log("Toggling status for account:", id, "to:", newStatus);

    // Optimistically update UI
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, is_active: newStatus } : acc
    ));

    try {
      // Prepare update data with all current account data, only changing isActive
      const updateData = {
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
        phone: account.phone,
        address: account.address,
        role: account.role,
        isActive: newStatus,
      };

      console.log("Calling updateAccount for toggle:", updateData);
      const result = await updateAccount(id, updateData);
      console.log("Toggle status result:", result);

      if (result.error) {
        console.error("Toggle status error:", result.error);
        // Revert the optimistic update on error
        setAccounts(accounts.map(acc => 
          acc.id === id ? { ...acc, is_active: account.is_active } : acc
        ));
        setError(result.error.message || "Failed to update account status");
        return;
      }

      if (result.data) {
        // Update with server response
        const updatedAccount = result.data;
        setAccounts(accounts.map(acc => 
          acc.id === id 
            ? { 
                ...acc, 
                first_name: updatedAccount.firstName,
                last_name: updatedAccount.lastName,
                email: updatedAccount.email,
                phone: updatedAccount.phone,
                address: updatedAccount.address,
                role: updatedAccount.role.toUpperCase() as UserRole,
                is_active: updatedAccount.isActive,
                updated_at: updatedAccount.updatedAt
              }
            : acc
        ));
        console.log("Status toggled successfully");
      }
    } catch (err) {
      console.error("Exception in handleToggleStatus:", err);
      // Revert the optimistic update on error
      setAccounts(accounts.map(acc => 
        acc.id === id ? { ...acc, is_active: account.is_active } : acc
      ));
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    }
  };

  const handleEditClick = (account: UserAccount) => {
    setEditingAccount(account);
    setShowEditModal(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Accounts</h1>
          <p className="text-gray-600 mt-1">View and manage all user accounts</p>
        </div>
        <button
          onClick={() => navigate("/ceo/create-account")}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Account
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Card padded>
          <AccountsFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </Card>
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <Card padded>
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Loading accounts...
          </div>
        ) : (
          <AccountsTable
            accounts={filteredAccounts}
            onEdit={handleEditClick}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>

      {/* Edit Modal */}
      <AccountModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingAccount(null);
        }}
        onSave={handleEdit}
        mode="edit"
        account={editingAccount}
        allowedRoles={['STORE_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']}
      />
    </div>
  );
}
