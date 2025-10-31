import { Edit, Eye, EyeOff } from "lucide-react";
import type { UserAccount, UserRole } from "../../types/user";

const roleLabels: Record<UserRole, string> = {
  'CUSTOMER': 'Customer',
  'CASHIER': 'Cashier',
  'STORE_MANAGER': 'Store Manager',
  'INVENTORY_MANAGER': 'Inventory Manager',
  'CEO': 'CEO',
};

interface AccountsTableProps {
  accounts: UserAccount[];
  onEdit: (account: UserAccount) => void;
  onToggleStatus: (id: string) => void;
}

export default function AccountsTable({ accounts, onEdit, onToggleStatus }: AccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No accounts found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
            <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="font-medium">{account.first_name} {account.last_name}</div>
              </td>
              <td className="py-3 px-4 text-gray-600">{account.email}</td>
              <td className="py-3 px-4 text-gray-600">{account.phone}</td>
              <td className="py-3 px-4">
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                  {roleLabels[account.role]}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  account.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {account.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-600 text-sm">{account.created_at}</td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(account)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleStatus(account.id)}
                    className={`p-2 rounded ${
                      account.is_active 
                        ? 'text-orange-600 hover:bg-orange-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={account.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {account.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

