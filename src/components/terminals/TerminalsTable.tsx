import { Edit, Eye, EyeOff } from "lucide-react";
import type { TerminalManagementResponse } from "../../services/terminal.api";

interface TerminalsTableProps {
  terminals: TerminalManagementResponse[];
  onEdit: (terminal: TerminalManagementResponse) => void;
  onToggleStatus: (terminal: TerminalManagementResponse) => void;
}

export default function TerminalsTable({ terminals, onEdit, onToggleStatus }: TerminalsTableProps) {
  if (terminals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No terminals found matching your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">Code</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Active Session</th>
            <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((terminal) => (
            <tr 
              key={terminal.id} 
              className="border-b border-gray-100 hover:bg-blue-50/50 transition-all duration-150 ease-in-out group"
            >
              <td className="py-3 px-4">
                <div className="font-medium group-hover:text-blue-700 transition-colors duration-150">
                  {terminal.code}
                </div>
              </td>
              <td className="py-3 px-4 text-gray-600 group-hover:text-gray-800 transition-colors duration-150">
                {terminal.description || '-'}
              </td>
              <td className="py-3 px-4">
                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 group-hover:shadow-sm ${
                  terminal.isActive 
                    ? 'bg-green-100 text-green-700 group-hover:bg-green-200' 
                    : 'bg-red-100 text-red-700 group-hover:bg-red-200'
                }`}>
                  {terminal.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 group-hover:shadow-sm ${
                  terminal.hasActiveSession 
                    ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                }`}>
                  {terminal.hasActiveSession ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(terminal);
                    }}
                    className="p-2 text-indigo-600 hover:bg-indigo-100 hover:scale-110 active:scale-95 rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(terminal);
                    }}
                    className={`p-2 rounded-lg transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      terminal.isActive 
                        ? 'text-orange-600 hover:bg-orange-50 focus:ring-orange-500' 
                        : 'text-green-600 hover:bg-green-50 focus:ring-green-500'
                    }`}
                    title={terminal.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {terminal.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

