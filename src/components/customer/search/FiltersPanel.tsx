import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { SearchParams } from "../../../types/customer.search";
import SubCategorySelector from "./SubCategorySelector";
import type { SubCategory } from "../../../types/customer.search";

interface FiltersPanelProps {
  params: SearchParams;
  onFilterChange: (key: keyof SearchParams, value: any) => void;
  onCategoryChange: (categoryId: number | undefined) => void;
  onSubCategoryChange: (subCategoryId: number | undefined) => void;
  subCategories: SubCategory[];
  categoryName?: string;
  onReset: () => void;
}

export default function FiltersPanel({
  params,
  onFilterChange,
  onCategoryChange,
  onSubCategoryChange,
  subCategories,
  categoryName,
  onReset,
}: FiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    params.inStockOnly ||
    params.offersOnly ||
    params.minPrice !== undefined ||
    params.maxPrice !== undefined ||
    params.sort !== "relevance";

  return (
    <div className="lg:sticky lg:top-4">
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm mb-4"
      >
        <span className="font-semibold text-gray-900">Filters</span>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {/* Filters Content */}
      <div
        className={`
          ${isOpen ? "block" : "hidden"} lg:block
          bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6
        `}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>

        {/* SubCategory Selector */}
        {params.categoryId && (
          <SubCategorySelector
            subCategories={subCategories}
            selectedSubCategoryId={params.subCategoryId}
            onSelect={onSubCategoryChange}
            onClear={() => onSubCategoryChange(undefined)}
            categoryName={categoryName}
          />
        )}

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select
            value={params.sort || "relevance"}
            onChange={(e) => onFilterChange("sort", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={params.inStockOnly || false}
              onChange={(e) => onFilterChange("inStockOnly", e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">In Stock Only</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={params.offersOnly || false}
              onChange={(e) => onFilterChange("offersOnly", e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Offers Only</span>
          </label>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                placeholder="Min"
                value={params.minPrice || ""}
                onChange={(e) => onFilterChange("minPrice", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max"
                value={params.maxPrice || ""}
                onChange={(e) => onFilterChange("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
