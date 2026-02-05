import type { Category } from "../../../types/customer.search";

interface CategoryGridProps {
  categories: Category[];
  onSelect: (categoryId: number) => void;
  selectedCategoryId?: number;
}

export default function CategoryGrid({ categories, onSelect, selectedCategoryId }: CategoryGridProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Browse by category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              p-6 rounded-xl border-2 transition-all duration-200
              ${selectedCategoryId === category.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
              }
            `}
          >
            <div className="flex flex-col items-center gap-3">
              {category.iconUrl ? (
                <img
                  src={category.iconUrl}
                  alt={category.name}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-2xl">{category.name.charAt(0)}</span>
                </div>
              )}
              <span className={`font-semibold text-sm ${selectedCategoryId === category.id ? "text-blue-700" : "text-gray-700"}`}>
                {category.name}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
