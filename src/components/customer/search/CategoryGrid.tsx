import type { Category } from "../../../types/customer.search";
import {
  Package,
  Shirt,
  UtensilsCrossed,
  Home,
  Dumbbell,
  Book,
  Smartphone,
  Laptop,
  Headphones,
  Car,
  Baby,
  Gamepad2,
  Music,
  Camera,
  Watch,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface CategoryGridProps {
  categories: Category[];
  onSelect: (categoryId: number) => void;
  selectedCategoryId?: number;
}

// Map category names to icons
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes("electron") || name.includes("tech")) return Smartphone;
  if (name.includes("cloth") || name.includes("fashion") || name.includes("wear")) return Shirt;
  if (name.includes("food") || name.includes("beverage") || name.includes("grocery")) return UtensilsCrossed;
  if (name.includes("home") || name.includes("garden") || name.includes("furniture")) return Home;
  if (name.includes("sport") || name.includes("fitness") || name.includes("outdoor")) return Dumbbell;
  if (name.includes("book") || name.includes("media") || name.includes("entertainment")) return Book;
  if (name.includes("phone") || name.includes("mobile")) return Smartphone;
  if (name.includes("laptop") || name.includes("computer")) return Laptop;
  if (name.includes("headphone") || name.includes("audio")) return Headphones;
  if (name.includes("car") || name.includes("auto") || name.includes("vehicle")) return Car;
  if (name.includes("baby") || name.includes("kids") || name.includes("child")) return Baby;
  if (name.includes("game") || name.includes("toy")) return Gamepad2;
  if (name.includes("music") || name.includes("instrument")) return Music;
  if (name.includes("camera") || name.includes("photo")) return Camera;
  if (name.includes("watch") || name.includes("jewelry")) return Watch;
  if (name.includes("bag") || name.includes("accessory")) return ShoppingBag;
  return Package; // Default icon
};

export default function CategoryGrid({ categories, onSelect, selectedCategoryId }: CategoryGridProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Browse by category</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => {
          const Icon = category.iconUrl 
            ? null 
            : getCategoryIcon(category.name);
          
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`
                group relative p-6 rounded-xl border transition-all duration-300 ease-in-out
                bg-white shadow-md hover:shadow-xl
                ${selectedCategoryId === category.id
                  ? "border-blue-500 shadow-lg"
                  : "border-gray-200 hover:border-blue-500 hover:-translate-y-1"
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
                ) : Icon ? (
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-colors
                    ${selectedCategoryId === category.id
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <span className="text-2xl">{category.name.charAt(0)}</span>
                  </div>
                )}
                <div className="text-center">
                  <span className={`font-semibold text-sm block ${selectedCategoryId === category.id ? "text-blue-700" : "text-gray-700"}`}>
                    {category.name}
                  </span>
                  {(category as any).productCount !== undefined && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      {(category as any).productCount} {(category as any).productCount === 1 ? "product" : "products"}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
