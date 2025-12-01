import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, User2, Clock, DollarSign, ShoppingCart } from "lucide-react";
import Card from "../components/sessions/primitives/Card";
import Header from "../components/sessions/primitives/Header";
import Row from "../components/sessions/primitives/Row";
import KPI from "../components/sessions/primitives/KPI";
import { sessionsApi } from "../services/sessions.api";
import type { CashierDetailTransformed } from "../services/sessions.api";

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const fmtMoney = (n: number) => fmt.format(n);

export default function CashierDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [cashier, setCashier] = useState<CashierDetailTransformed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCashierDetail = async () => {
      if (!id) {
        setError("Session ID is missing");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const sessionId = parseInt(id, 10);
      
      if (isNaN(sessionId)) {
        setError("Invalid session ID");
        setLoading(false);
        return;
      }

      console.log("Fetching cashier detail for sessionId:", sessionId);
      const data = await sessionsApi.fetchCashierDetail(sessionId);
      
      console.log("Cashier detail response:", data);
      
      if (data) {
        // Transform the nested structure to flat structure for easier use in component
        const transformedData = {
          cashierId: data.cashierInfo.cashierId,
          name: data.cashierInfo.name,
          email: data.cashierInfo.email,
          phone: data.cashierInfo.phone,
          role: data.cashierInfo.role,
          active: data.cashierInfo.active,
          sessionId: data.sessionInfo.sessionId,
          openedAt: data.sessionInfo.openedAt,
          openingFloat: data.sessionInfo.openingFloat,
          closingAmount: data.sessionInfo.closingAmount,
          totalOrders: data.performance.totalOrders,
          totalSales: data.performance.totalSales,
          cashIn: data.performance.cashIn,
          cardIn: data.performance.cardIn,
          transactions: data.recentTransactions.map(t => ({
            orderNumber: t.orderNumber,
            time: t.time, // Format time if needed
            amount: t.amount
          }))
        };
        
        console.log("Transformed cashier data:", transformedData);
        setCashier(transformedData);
      } else {
        console.error("No data received for cashier detail");
        setError("Failed to load cashier details. Please check if the session ID is correct.");
      }
      setLoading(false);
    };

    fetchCashierDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-gray-800">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading cashier details...</p>
        </div>
      </div>
    );
  }

  if (error || !cashier) {
    return (
      <div className="p-6 text-gray-800">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </button>
        <div className="flex items-center justify-center py-12">
          <p className="text-red-600">Error: {error || "Cashier not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-800">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Cashier Details</h1>
        <p className="text-slate-600">Complete information for {cashier.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <Header icon={<User2 className="h-5 w-5" />} title="Cashier Information" />
          <div>
            <Row label="Name" value={cashier.name} />
            <Row label="Email" value={cashier.email} />
            <Row label="Phone" value={cashier.phone} />
            <Row label="Role" value={cashier.role} />
            <Row
              label="Status"
              value={
                <span
                  className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    cashier.active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {cashier.active ? "Active" : "Inactive"}
                </span>
              }
            />
          </div>
        </Card>

        <Card className="xl:col-span-1">
          <Header icon={<Clock className="h-5 w-5" />} title="Session Information" />
          {cashier.active && cashier.sessionId ? (
            <div>
              <Row label="Session ID" value={cashier.sessionId.toString()} />
              <Row
                label="Started"
                value={cashier.openedAt ? new Date(cashier.openedAt).toLocaleString() : "-"}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <KPI label="Opening Float" value={fmtMoney(cashier.openingFloat || 0)} />
                <KPI
                  label="Closing Amount"
                  value={cashier.closingAmount !== null ? fmtMoney(cashier.closingAmount) : "N/A"}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No active session</p>
          )}
        </Card>

        <Card className="xl:col-span-1">
          <Header icon={<ShoppingCart className="h-5 w-5" />} title="Performance" />
          <div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <KPI label="Total Orders" value={cashier.totalOrders || 0} />
              <KPI label="Total Sales" value={fmtMoney(cashier.totalSales || 0)} />
            </div>
            <Row label="Cash In" value={fmtMoney(cashier.cashIn || 0)} />
            <Row label="Card In" value={fmtMoney(cashier.cardIn || 0)} />
          </div>
        </Card>
      </div>

      {cashier.transactions && cashier.transactions.length > 0 && (
        <Card className="mt-6">
          <Header icon={<DollarSign className="h-5 w-5" />} title="Recent Transactions" />
          <div className="mt-3 rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-3 py-2 text-sm text-gray-600 bg-gray-50">
              Transaction History
            </div>
            <ul className="divide-y divide-gray-200">
              {cashier.transactions.map((t, index) => {
                // Format time - extract just the time part from ISO string
                const timeStr = t.time ? new Date(t.time).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                }) : t.time;
                
                return (
                  <li key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-900">{t.orderNumber}</span>
                    <span className="text-gray-600">{timeStr}</span>
                    <span className="inline-flex items-center gap-1 text-gray-900">
                      <DollarSign className="h-4 w-4" />
                      {fmtMoney(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}

