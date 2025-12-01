import React from "react";
import { Search, Calendar, Clock } from "lucide-react";

interface SessionsFiltersProps {
  dateFilter: string;
  onDateChange: (value: string) => void;
  timeFilter: string;
  onTimeChange: (value: string) => void;
  statusFilter: "ALL" | "ACTIVE" | "INACTIVE";
  onStatusChange: (value: "ALL" | "ACTIVE" | "INACTIVE") => void;
  nameFilter: string;
  onNameChange: (value: string) => void;
}

export default function SessionsFilters({
  dateFilter,
  onDateChange,
  timeFilter,
  onTimeChange,
  statusFilter,
  onStatusChange,
  nameFilter,
  onNameChange,
}: SessionsFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by cashier name..."
          value={nameFilter}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="time"
          value={timeFilter}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="ALL">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </select>
    </div>
  );
}

