import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card } from "../components";
import PageHeader from "../components/PageHeader";
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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

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

  useEffect(() => {
    setPage(0);
  }, [searchTerm, roleFilter, statusFilter, pageSize]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  }, [filteredAccounts.length, pageSize]);

  const currentPage = Math.min(page, totalPages - 1);

  const pagedAccounts = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return filteredAccounts.slice(start, end);
  }, [filteredAccounts, currentPage, pageSize]);

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
      <PageHeader
        title="Manage Accounts"
        icon={<span className="text-2xl">👥</span>}
        right={
          <button
            onClick={() => navigate("/dashboard/create-account")}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Account
          </button>
        }
      />

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
          <>
            <AccountsTable
              accounts={pagedAccounts}
              onEdit={handleEditClick}
              onToggleStatus={handleToggleStatus}
            />

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filteredAccounts.length === 0 ? 0 : currentPage * pageSize + 1}
                </span>
                {" "}to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min((currentPage + 1) * pageSize, filteredAccounts.length)}
                </span>
                {" "}of{" "}
                <span className="font-semibold text-slate-900">{filteredAccounts.length}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all"
                >
                  {[10, 20, 50].map((s) => (
                    <option key={s} value={s}>
                      {s} / page
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>

                <div className="px-3 py-2 text-sm font-semibold text-slate-700">
                  Page {currentPage + 1} / {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
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
