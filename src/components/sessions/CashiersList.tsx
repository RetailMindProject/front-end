import { User2, Clock, DollarSign, ShoppingCart } from "lucide-react";

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

interface CashiersListProps {
  cashiers: Cashier[];
  onCashierClick: (cashierId: string, sessionId?: string) => void;
  fmtMoney: (n: number) => string;
}

export default function CashiersList({ cashiers, onCashierClick, fmtMoney }: CashiersListProps) {
  console.log("CashiersList received cashiers:", cashiers);
  console.log("Number of cashiers to display:", cashiers.length);
  
  if (cashiers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No cashiers found matching your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cashiers.map((cashier) => {
        const hasSession = cashier.isActive && cashier.sessionId;
        return (
        <div
          key={cashier.id}
          onClick={() => {
            if (hasSession) {
              onCashierClick(cashier.id, cashier.sessionId);
            }
          }}
          className={`rounded-lg border border-gray-200 bg-white p-5 shadow-md transition-all duration-200 ${
            hasSession 
              ? "cursor-pointer hover:shadow-lg hover:border-indigo-300 group" 
              : "cursor-not-allowed opacity-75"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-indigo-100 p-2 group-hover:bg-indigo-200 transition-colors">
                <User2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {cashier.name}
                </h3>
                <p className="text-sm text-gray-500">{cashier.email}</p>
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded-lg text-xs font-medium ${
                cashier.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {cashier.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {cashier.isActive && cashier.sessionId && (
            <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Session
                </span>
                <span className="text-gray-900 font-medium">{cashier.sessionId}</span>
              </div>
              {cashier.openedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Started</span>
                  <span className="text-gray-900">
                    {new Date(cashier.openedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {cashier.orders !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4" />
                    Orders
                  </span>
                  <span className="text-gray-900 font-medium">{cashier.orders}</span>
                </div>
              )}
              {cashier.sales !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Sales
                  </span>
                  <span className="text-gray-900 font-medium">{fmtMoney(cashier.sales)}</span>
                </div>
              )}
            </div>
          )}

          {!cashier.isActive && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">No active session</p>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

