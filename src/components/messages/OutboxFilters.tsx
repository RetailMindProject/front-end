import { Search, Filter } from "lucide-react";
import { useState } from "react";

interface OutboxFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: "all" | "sent" | "delivered" | "read";
  onStatusFilterChange: (status: "all" | "sent" | "delivered" | "read") => void;
  recipientFilter: "all" | "CEO" | "Store Manager" | "Inventory Manager";
  onRecipientFilterChange: (recipient: "all" | "CEO" | "Store Manager" | "Inventory Manager") => void;
}

export default function OutboxFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  recipientFilter,
  onRecipientFilterChange,
}: OutboxFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium text-sm transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            showFilters
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {(["all", "sent", "delivered", "read"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2 uppercase tracking-wide">
              Recipient
            </label>
            <div className="flex flex-wrap gap-2">
              {(["all", "CEO", "Store Manager", "Inventory Manager"] as const).map((recipient) => (
                <button
                  key={recipient}
                  onClick={() => onRecipientFilterChange(recipient)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    recipientFilter === recipient
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {recipient}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






