import { Search, X } from "lucide-react";

interface EmptyStateProps {
  onClearFilters?: () => void;
  showPopularProducts?: boolean;
}

export default function EmptyState({ onClearFilters, showPopularProducts }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found.</h3>
      <p className="text-gray-600 mb-6">
        Try adjusting your filters or search terms to find what you're looking for.
      </p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <X className="h-4 w-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
}
