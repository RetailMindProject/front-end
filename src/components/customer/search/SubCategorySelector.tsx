import { X } from "lucide-react";
import type { SubCategory } from "../../../types/customer.search";

interface SubCategorySelectorProps {
  subCategories: SubCategory[];
  selectedSubCategoryId?: number;
  onSelect: (subCategoryId: number) => void;
  onClear: () => void;
  categoryName?: string;
}

export default function SubCategorySelector({
  subCategories,
  selectedSubCategoryId,
  onSelect,
  onClear,
  categoryName,
}: SubCategorySelectorProps) {
  if (subCategories.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {categoryName ? `${categoryName} - Subcategories` : "Select Subcategory"}
        </h3>
        {selectedSubCategoryId && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {subCategories.map((subCat) => (
          <button
            key={subCat.id}
            onClick={() => onSelect(subCat.id)}
            className={`
              px-4 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium
              ${selectedSubCategoryId === subCat.id
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
              }
            `}
          >
            {subCat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
