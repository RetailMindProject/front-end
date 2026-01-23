import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import OrderHistorySection from "../components/customer/OrderHistorySection";
import { useOrders } from "../hooks/useOrders";

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { orders, loading } = useOrders(30, 200);
  const ordersData = orders?.orders ?? [];

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(ordersData.length / pageSize)), [ordersData.length, pageSize]);
  const currentPage = Math.min(page, totalPages - 1);

  const pageOrders = useMemo(() => {
    const start = currentPage * pageSize;
    return ordersData.slice(start, start + pageSize);
  }, [ordersData, currentPage, pageSize]);

  return (
    <div className="pt-2">
      <BackButton onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back
      </BackButton>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Order History</h2>
      </div>

      <OrderHistorySection orders={pageOrders} loading={loading} />

      {!loading && ordersData.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-600">
            Showing{" "}
            <span className="font-semibold text-slate-900">{currentPage * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min((currentPage + 1) * pageSize, ordersData.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{ordersData.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all"
            >
              {[5, 10, 15, 20].map((s) => (
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
      )}
    </div>
  );
}

