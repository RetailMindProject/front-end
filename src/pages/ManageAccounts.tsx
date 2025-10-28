import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Card } from "../components";
import AccountsTable from "../components/accounts/AccountsTable";
import AccountsFilters from "../components/accounts/AccountsFilters";
import AccountModal from "../components/accounts/AccountModal";
import type { UserAccount, UserRole } from "../types/user";

// Mock data
const mockAccounts: UserAccount[] = [
  {
    id: '1',
    first_name: 'Ahmad',
    last_name: 'Ali',
    email: 'ahmad@example.com',
    phone: '+970 5x xxx xxxx',
    address: 'Ramallah, Palestine',
    role: 'STORE_MANAGER',
    is_active: true,
    created_at: '2025-01-15',
    updated_at: '2025-01-20',
  },
  {
    id: '2',
    first_name: 'Sara',
    last_name: 'Mohammed',
    email: 'sara@example.com',
    phone: '+970 5x xxx xxxx',
    address: 'Nablus, Palestine',
    role: 'CASHIER',
    is_active: true,
    created_at: '2025-01-16',
    updated_at: '2025-01-21',
  },
  {
    id: '3',
    first_name: 'Mohammed',
    last_name: 'Ahmed',
    email: 'mohammed@example.com',
    phone: '+970 5x xxx xxxx',
    address: 'Jerusalem, Palestine',
    role: 'INVENTORY_MANAGER',
    is_active: false,
    created_at: '2025-01-10',
    updated_at: '2025-01-15',
  },
  {
    id: '4',
    first_name: 'Fatima',
    last_name: 'Hassan',
    email: 'fatima@example.com',
    phone: '+970 5x xxx xxxx',
    address: 'Hebron, Palestine',
    role: 'CASHIER',
    is_active: true,
    created_at: '2025-01-18',
    updated_at: '2025-01-22',
  },
];

export default function ManageAccounts() {
  const [accounts, setAccounts] = useState<UserAccount[]>(mockAccounts);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

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

  const handleCreate = async (data: any) => {
    const newAccount: UserAccount = {
      ...data,
      id: Date.now().toString(),
      is_active: true,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    setAccounts([...accounts, newAccount]);
    setShowCreateModal(false);
    alert('Account created successfully');
  };

  const handleEdit = async (data: any) => {
    if (!editingAccount) return;
    
    setAccounts(accounts.map(acc => 
      acc.id === editingAccount.id 
        ? { ...acc, ...data, updated_at: new Date().toISOString().split('T')[0] }
        : acc
    ));
    setShowEditModal(false);
    setEditingAccount(null);
    alert('Account updated successfully');
  };

  const handleToggleStatus = (id: string) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, is_active: !acc.is_active } : acc
    ));
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
          onClick={() => setShowCreateModal(true)}
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

      {/* Accounts Table */}
      <Card padded>
        <AccountsTable
          accounts={filteredAccounts}
          onEdit={handleEditClick}
          onToggleStatus={handleToggleStatus}
        />
      </Card>

      {/* Create Modal */}
      <AccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        mode="create"
        allowedRoles={['STORE_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']}
      />

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
