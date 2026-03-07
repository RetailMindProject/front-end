import { useMemo, useState, useEffect } from "react";
import { Edit, Eye, Ban, Filter as FilterIcon } from "lucide-react";
import Pagination from "../Pagination";
import type { OfferType, DiscountType } from "./OfferForm";

export interface Offer {
  id: string;
  title: string;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
}

interface OffersTableProps {
  offers: Offer[];
  onEdit: (offer: Offer) => void;
  onToggleActive: (id: string) => void;
  onView: (offer: Offer) => void;
}

type OfferTypeFilter = "ALL" | OfferType;
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function OfferTypeBadge({ type }: { type: OfferType }) {
  const labels: Record<OfferType, string> = {
    PRODUCT: "Product",
    CATEGORY: "Category",
    ORDER: "Order",
    BUNDLE: "Bundle",
  };
  const colors: Record<OfferType, string> = {
    PRODUCT: "bg-blue-100 text-blue-700",
    CATEGORY: "bg-purple-100 text-purple-700",
    ORDER: "bg-amber-100 text-amber-700",
    BUNDLE: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}

function formatDiscount(discountType: DiscountType, value: number): string {
  return discountType === "PERCENTAGE" ? `${value}%` : `$${value.toFixed(2)}`;
}

function formatDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = new Date(endAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${start} - ${end}`;
}

export default function OffersTable({ offers, onEdit, onToggleActive, onView }: OffersTableProps) {
  const [typeFilter, setTypeFilter] = useState<OfferTypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesType = typeFilter === "ALL" || offer.offerType === typeFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && offer.isActive) ||
        (statusFilter === "INACTIVE" && !offer.isActive);
      return matchesType && matchesStatus;
    });
  }, [offers, typeFilter, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOffers.length / pageSize);
  const paginatedOffers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOffers.slice(startIndex, endIndex);
  }, [filteredOffers, currentPage, pageSize]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Filters */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OfferTypeFilter)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types</option>
            <option value="PRODUCT">Product</option>
            <option value="CATEGORY">Category</option>
            <option value="ORDER">Order</option>
            <option value="BUNDLE">Bundle</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <div className="ml-auto text-xs text-slate-500">
            Showing {paginatedOffers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredOffers.length)} of {filteredOffers.length} offers
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedOffers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No offers found
                </td>
              </tr>
            ) : (
              paginatedOffers.map((offer) => (
                <tr key={offer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{offer.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <OfferTypeBadge type={offer.offerType} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">{formatDiscount(offer.discountType, offer.discountValue)}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDateRange(offer.startAt, offer.endAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge isActive={offer.isActive} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(offer)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(offer)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onToggleActive(offer.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          offer.isActive
                            ? "text-slate-600 hover:text-red-600 hover:bg-red-50"
                            : "text-slate-400 hover:text-green-600 hover:bg-green-50"
                        }`}
                        aria-label={offer.isActive ? "Deactivate" : "Activate"}
                        title={offer.isActive ? "Deactivate offer" : "Activate offer"}
                      >
                        <Ban className={`h-4 w-4 ${offer.isActive ? "" : "opacity-50"}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredOffers.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

