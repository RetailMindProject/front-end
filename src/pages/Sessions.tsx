import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import SessionsFilters from "../components/sessions/SessionsFilters";
import CashiersList from "../components/sessions/CashiersList";
import { sessionsApi } from "../services/sessions.api";
import type { SessionListItem } from "../services/sessions.api";

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtMoney = (n: number) => fmt.format(n);

type Cashier = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  sessionId?: string;
  openedAt?: string;
  openingFloat?: number;
  closedFloat?: number;
  orders?: number;
  sales?: number;
};

export default function Sessions() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [nameFilter, setNameFilter] = useState("");
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      
      let data: SessionListItem[] | null = null;

      // If status is ACTIVE and no other filters, use the active endpoint
      if (statusFilter === "ACTIVE" && !nameFilter.trim() && !dateFilter && !timeFilter) {
        data = await sessionsApi.fetchActiveSessions();
      } else {
        // Build filters from state for other cases
        const filters: {
          cashierName?: string;
          date?: string;
          time?: string;
          status?: string;
        } = {};

        if (nameFilter.trim()) {
          filters.cashierName = nameFilter.trim();
        }
        if (dateFilter) {
          filters.date = dateFilter;
        }
        if (timeFilter) {
          filters.time = timeFilter;
        }
        if (statusFilter === "ACTIVE") {
          filters.status = "OPEN";
        } else if (statusFilter === "INACTIVE") {
          filters.status = "CLOSED";
        } else if (statusFilter === "ALL") {
          filters.status = "ALL";
        }

        data = await sessionsApi.fetchSessions(filters);
      }
      
      if (data && Array.isArray(data)) {
        console.log("Fetched sessions data:", data);
        console.log("Number of sessions:", data.length);
        
        // Map API response to component format
        const mappedCashiers: Cashier[] = data.map((item: SessionListItem) => {
          const cashier: Cashier = {
            id: item.cashierId?.toString() || "",
            name: `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Unknown",
            email: item.email || "",
            phone: "", // Not available in sessions list API
            isActive: item.status === "OPEN",
            sessionId: item.sessionId?.toString(),
            openedAt: item.openedAt || undefined,
            openingFloat: undefined, // Not available in sessions list
            closedFloat: undefined,
            orders: item.ordersCount || 0,
            sales: item.totalSales || 0,
          };
          console.log("Mapped cashier:", cashier);
          return cashier;
        });
        
        console.log("Total mapped cashiers:", mappedCashiers.length);
        setCashiers(mappedCashiers);
      } else {
        console.error("No data received from API or data is not an array");
        setError("Failed to load sessions. No data received.");
        setCashiers([]);
      }
      setLoading(false);
    };

    fetchSessions();
  }, [nameFilter, dateFilter, timeFilter, statusFilter]);

  // Filtering is now done on the backend, but we keep this for client-side filtering if needed
  const filteredCashiers = useMemo(() => {
    return [...cashiers];
  }, [cashiers]);

  const handleCashierClick = (_cashierId: string, sessionId?: string) => {
    // Navigate using sessionId if available
    // Note: The API requires sessionId to fetch cashier details
    if (sessionId) {
      navigate(`/store-manager/sessions/cashier/${sessionId}`);
    } else {
      // If no session, show error message
      setError(`No active session found for this cashier. Cannot view details.`);
    }
  };

  return (
    <div className="p-6 text-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-slate-600">Manage cashier sessions and view active status</p>
        </div>
        <button
          onClick={() => navigate("/store-manager/create-account")}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Cashier
        </button>
      </div>

      <SessionsFilters
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        timeFilter={timeFilter}
        onTimeChange={setTimeFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        nameFilter={nameFilter}
        onNameChange={setNameFilter}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-red-600">Error: {error}</p>
        </div>
      ) : (
        <CashiersList
          cashiers={filteredCashiers}
          onCashierClick={handleCashierClick}
          fmtMoney={fmtMoney}
        />
      )}
    </div>
  );
}
