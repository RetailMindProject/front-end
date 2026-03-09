import { useState, useEffect } from "react";
import { useProductSearch } from "../hooks/useProductSearch";
import { customerBrowseApi } from "../services/customer.browse.api";
import type { Category, SubCategory } from "../types/customer.search";
import { useNavigate } from "react-router-dom";
import { clearAllTokens } from "../services/tokens";
import SearchBar from "../components/customer/search/SearchBar";
import CategoryGrid from "../components/customer/search/CategoryGrid";
import FiltersPanel from "../components/customer/search/FiltersPanel";
import ProductGrid from "../components/customer/search/ProductGrid";
import EmptyState from "../components/customer/search/EmptyState";
import LoadingSkeleton from "../components/customer/search/LoadingSkeleton";
import ProductDetailsModal from "../components/customer/search/ProductDetailsModal";
import Pagination from "../components/Pagination";
import { Loader2, AlertCircle, Clock, ArrowLeft, X } from "lucide-react";

const POPULAR_SEARCHES = [
  "Smartphones",
  "Laptops",
  "Headphones",
  "Fresh Produce",
  "Furniture",
  "Fitness Equipment",
];

const STORAGE_KEY_RECENT_SEARCHES = "customer_recent_searches";
const MAX_RECENT_SEARCHES = 7;

export default function CustomerSearchPage() {
  const navigate = useNavigate();
  const {
    items,
    total,
    totalPages,
    currentPage,
    loading,
    error,
    params,
    setQuery,
    setCategory,
    setSubCategory,
    setFilter,
    setPage,
    loadMore,
    resetFilters,
    hasMore,
  } = useProductSearch();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      setCategoryError(null);
      try {
        const result = await customerBrowseApi.getCategories();
        
        if (result.status === 401 || result.status === 403) {
          clearAllTokens();
          navigate("/login");
          return;
        }
        
        if (result.error) {
          setCategoryError(result.error);
          setCategories([]);
        } else if (result.data) {
          setCategories(result.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
        setCategoryError(err instanceof Error ? err.message : "Failed to load categories");
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, [navigate]);

  // Load subcategories when category is selected
  useEffect(() => {
    if (params.categoryId) {
      const selectedCategory = categories.find(c => c.id === params.categoryId);
      // Only fetch subcategories if the category has children
      if (selectedCategory?.hasChildren) {
        const loadSubCategories = async () => {
          try {
            const result = await customerBrowseApi.getSubCategories(params.categoryId!);
            
            if (result.status === 401 || result.status === 403) {
              clearAllTokens();
              navigate("/login");
              return;
            }
            
            if (result.error) {
              console.error("Failed to load subcategories:", result.error);
              setSubCategories([]);
            } else if (result.data) {
              // Transform to include categoryId for backward compatibility
              const transformed = result.data.map(sc => ({
                ...sc,
                categoryId: sc.parentId,
              }));
              setSubCategories(transformed);
            }
          } catch (err) {
            console.error("Failed to load subcategories:", err);
            setSubCategories([]);
          }
        };
        loadSubCategories();
      } else {
        // Category has no children, clear subcategories
        setSubCategories([]);
      }
    } else {
      setSubCategories([]);
    }
  }, [params.categoryId, categories, navigate]);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT_SEARCHES);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save search to recent searches
  const handleSearch = (query: string) => {
    if (query.trim()) {
      setQuery(query);
      const updated = [
        query.trim(),
        ...recentSearches.filter((s) => s !== query.trim()),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY_RECENT_SEARCHES, JSON.stringify(updated));
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    const selectedCategory = categories.find(c => c.id === categoryId);
    // If category has children, just select it (subcategories will load)
    // If category has no children, select it and show products directly
    setCategory(categoryId);
    if (selectedCategory && !selectedCategory.hasChildren) {
      // Category has no children, show products immediately
      // The hook will handle fetching products
    }
  };

  const handleCategoryClear = () => {
    setCategory(undefined);
  };

  const handleSubCategorySelect = (subCategoryId: number) => {
    setSubCategory(subCategoryId);
  };

  const handleSubCategoryClear = () => {
    setSubCategory(undefined);
  };

  const handlePopularSearchClick = (term: string) => {
    handleSearch(term);
  };

  const handleRecentSearchClick = (term: string) => {
    handleSearch(term);
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(STORAGE_KEY_RECENT_SEARCHES);
  };

  const handleSearchSubmit = () => {
    // Search is already triggered by onChange via handleSearch
    // This is just for explicit Enter key handling
    if (params.q && params.q.trim()) {
      setQuery(params.q.trim());
    }
  };


  // Determine what to show
  const selectedCategory = categories.find((c) => c.id === params.categoryId);
  const showInitialState = !params.q && !params.subCategoryId && !params.categoryId;
  const showSubCategoriesOnly = params.categoryId && selectedCategory?.hasChildren && !params.subCategoryId && !params.q;
  // Show products if: subcategory selected, OR category selected (without children), OR search query provided
  const showProducts = 
    params.subCategoryId !== undefined || 
    (params.categoryId !== undefined && !selectedCategory?.hasChildren) ||
    (params.q !== undefined && params.q.trim() !== "");

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar 
            value={params.q || ""} 
            onChange={handleSearch}
            onSearch={handleSearchSubmit}
          />
        </div>

        {/* Initial State: Categories + Popular/Recent Searches */}
        {showInitialState && (
          <div className="space-y-10">
            {loadingCategories ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : categoryError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Error loading categories</h3>
                    <p className="text-sm text-red-700 mt-1">{categoryError}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <CategoryGrid
                  categories={categories}
                  onSelect={handleCategorySelect}
                  selectedCategoryId={params.categoryId}
                />
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    Recent Searches
                  </h3>
                  <button
                    onClick={handleClearRecentSearches}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentSearchClick(term)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div className="animate-in fade-in duration-300">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Popular Searches</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => handlePopularSearchClick(term)}
                    className="px-6 py-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 text-center"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SubCategories Only (when category selected but no subcategory) */}
        {showSubCategoriesOnly && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory?.name || "Select Subcategory"}
              </h2>
              <button
                onClick={handleCategoryClear}
                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 ease-in-out group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                <svg className="relative z-10 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="relative z-10 font-medium text-sm">Back to Categories</span>
              </button>
            </div>
            {subCategories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {subCategories.map((subCat) => (
                  <button
                    key={subCat.id}
                    onClick={() => handleSubCategorySelect(subCat.id)}
                    className="p-6 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left"
                  >
                    <h3 className="font-semibold text-gray-900">{subCat.name}</h3>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                No subcategories found for this category.
              </div>
            )}
          </div>
        )}

        {/* Main Content: Filters + Products */}
        {showProducts && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Panel */}
            <div className="lg:col-span-1">
              <FiltersPanel
                params={params}
                onFilterChange={setFilter}
                onCategoryChange={setCategory}
                onSubCategoryChange={setSubCategory}
                subCategories={subCategories}
                categoryName={selectedCategory?.name}
                onReset={resetFilters}
              />
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {/* Results Header */}
              {!loading && (
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {params.q ? `Search Results for "${params.q}"` : "Products"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {total} {total === 1 ? "product" : "products"} found
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {params.subCategoryId && (
                      <button
                        onClick={handleSubCategoryClear}
                        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 ease-in-out group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <svg className="relative z-10 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="relative z-10 font-medium text-sm">Back to Subcategories</span>
                      </button>
                    )}
                    {params.categoryId && !params.subCategoryId && (
                      <button
                        onClick={handleCategoryClear}
                        className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 ease-in-out group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                        <svg className="relative z-10 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="relative z-10 font-medium text-sm">Back to Categories</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">
                        {error.includes("minPrice must be") || error.includes("Invalid filter") 
                          ? "Invalid Filter Parameters" 
                          : "Error loading products"}
                      </h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      {error.includes("minPrice must be") && (
                        <p className="text-xs text-red-600 mt-2">
                          Please ensure minimum price is less than or equal to maximum price.
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Clear error by resetting filters that might be invalid
                        if (error.includes("minPrice") || error.includes("maxPrice")) {
                          setFilter("minPrice", undefined);
                          setFilter("maxPrice", undefined);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Fix
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && items.length === 0 && (
                <div className="animate-in fade-in duration-300">
                  <LoadingSkeleton />
                </div>
              )}

              {/* Products Grid */}
              {!loading && items.length > 0 && (
                <div className="animate-in fade-in duration-300">
                  <ProductGrid 
                    products={items} 
                    onProductClick={(product) => {
                      setSelectedProductId(product.id);
                      setShowProductDetails(true);
                    }}
                  />
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8">
                      <Pagination
                        currentPage={currentPage + 1} // Convert 0-based to 1-based for display
                        totalPages={totalPages}
                        onPageChange={(page) => setPage(page - 1)} // Convert 1-based back to 0-based
                      />
                    </div>
                  )}
                  
                  {/* Load More (alternative to pagination) */}
                  {totalPages <= 1 && hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          "Load More"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {!loading && items.length === 0 && !error && (
                <div className="animate-in fade-in duration-300">
                  <EmptyState onClearFilters={resetFilters} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {showProductDetails && selectedProductId && (
        <ProductDetailsModal
          productId={selectedProductId}
          isOpen={showProductDetails}
          onClose={() => {
            setShowProductDetails(false);
            setSelectedProductId(null);
          }}
        />
      )}
    </div>
  );
}
