import { useState, useEffect } from 'react';
import { Package, AlertTriangle, X } from 'lucide-react';
import StoreManager from '../components/Operations/StoreManager';
import { storeProductsApi, type StoreProductResponseDTO, type StoreTransferRequestDTO } from '../services/store-products.api';
import { productsApi, type ProductDTO } from '../services/products.api';
import PageHeader from "../components/PageHeader";
import { transferRequestsApi } from "../services/transfer-requests.api";

type UIStoreProduct = StoreProductResponseDTO & {
  imageUrl?: string | null;
  orders?: number;
  sales?: number;
  createdAt?: string;
  updatedAt?: string;
};

export default function StoreOperations() {
  const [storeProducts, setStoreProducts] = useState<UIStoreProduct[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestToast, setRequestToast] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    brand: '',
    sku: '',
    minPrice: '',
    maxPrice: '',
    isActive: ''
  });
  const [sortBy, setSortBy] = useState<'sales' | 'none'>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'lowStock' | 'outOfStock'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Summary statistics
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0
  });

  const fetchStoreProducts = async (filterOverrides?: typeof filters, pageOverride?: number, sizeOverride?: number) => {
    try {
      setLoading(true);
      setError(null);
      // Use filterOverrides if provided, otherwise use current filters state
      const activeFilters = filterOverrides !== undefined ? filterOverrides : filters;
      const page = pageOverride !== undefined ? pageOverride : currentPage;
      const size = sizeOverride !== undefined ? sizeOverride : itemsPerPage;
      
      // ✅ OPTIMIZED: Use productsApi.filter with includeStock to get all data in one call
      // ✅ Backend filtering: minStoreQuantity=1 to only get products with store stock
      // ✅ Backend sorting: sort parameter for sales sorting
      const res = await productsApi.filter({
        page: page,
        size: size,
        brand: activeFilters.brand || undefined,
        sku: activeFilters.sku || undefined,
        minPrice: activeFilters.minPrice ? Number(activeFilters.minPrice) : undefined,
        maxPrice: activeFilters.maxPrice ? Number(activeFilters.maxPrice) : undefined,
        isActive: activeFilters.isActive === '' ? undefined : activeFilters.isActive === 'true',
        minStoreQuantity: 1,       // ✅ Backend filter: only products with storeQuantity > 0
        sort: sortBy === 'sales' ? 'sales_desc' : undefined,  // ✅ Backend sorting
        includeStock: true,        // Request stock quantities in the same call
        includeCategories: true    // Request categories in the same call
      });
      
      if (res.data) {
        // Handle paginated response - same strategy as InventoryOperations
        let content: ProductDTO[] = [];
        let totalPagesValue = 0;
        let totalElementsValue = 0;
        
        if (typeof res.data === 'object' && 'content' in res.data) {
          // Paginated response
          const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number; number: number; size: number };
          content = pageData.content || [];
          totalPagesValue = pageData.totalPages || 0;
          totalElementsValue = pageData.totalElements || 0;
        } else if (Array.isArray(res.data)) {
          // Array response (fallback)
          content = res.data as ProductDTO[];
          totalPagesValue = 1;
          totalElementsValue = content.length;
        } else {
          content = (res.data as any).content || [];
          totalPagesValue = (res.data as any).totalPages || 0;
          totalElementsValue = (res.data as any).totalElements || 0;
        }
        
        setTotalPages(totalPagesValue);
        setTotalElements(totalElementsValue);
        
        // ✅ OPTIMIZED: Data is already in response, no individual API calls needed
        // ✅ Backend already filtered by minStoreQuantity=1, so no client-side filtering needed
        // ✅ Backend already sorted if sortBy='sales', so no client-side sorting needed
        const normalized: UIStoreProduct[] = content
          .map((p) => {
            // Check both field name variations
            const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
            const storeQty = (p as any).storeQuantity ?? (p as any).storeQty ?? 0;
            
            // Extract image URL
            let imageUrl: string | null | undefined = null;
            if (p.images && Array.isArray(p.images) && p.images.length > 0) {
              const primaryImage = p.images.find(img => img.isPrimary) || p.images[0];
              if (primaryImage?.url) {
                imageUrl = productsApi.normalizeImageUrl(primaryImage.url, p.id);
              }
            }
            if (!imageUrl && p.primaryImageUrl) {
              imageUrl = productsApi.normalizeImageUrl(p.primaryImageUrl, p.id);
            }
            if (!imageUrl && p.imageUrl) {
              imageUrl = productsApi.normalizeImageUrl(p.imageUrl, p.id);
            }
            
            // Extract category name
            let categoryName: string | undefined;
            if (Array.isArray(p.categories) && p.categories.length > 0) {
              categoryName = p.categories[0].name;
            } else if (typeof p.category === 'string') {
              categoryName = p.category;
            } else if (p.category && typeof p.category === 'object') {
              const catObj = p.category as any;
              categoryName = catObj.name || catObj.title;
            }
            
            return {
              productId: typeof p.id === 'string' ? parseInt(p.id) : p.id,
              productName: p.name,
              sku: p.sku,
              brand: p.brand,
              category: categoryName,
              price: p.price ?? p.defaultPrice ?? 0,
              cost: p.cost ?? p.defaultCost,
              warehouseQuantity: warehouseQty,
              warehouseQty: warehouseQty,
              storeQuantity: storeQty,
              storeQty: storeQty,
              imageUrl: imageUrl || p.imageUrl || null,
              primaryImageUrl: p.primaryImageUrl,
              images: p.images,
              isActive: p.isActive,
              orders: (p as any).orders || 0,
              sales: (p as any).sales || 0,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            } as UIStoreProduct;
          });
        
        setStoreProducts(normalized);
      } else {
        setError(res.error || 'Failed to load store products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store products');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryProducts = async () => {
    try {
      // ✅ OPTIMIZED: Include stock and categories in one call
      const res = await productsApi.filter({
        page: 0,
        size: 1000,
        isActive: true,
        includeStock: true,        // Request stock quantities in the same call
        includeCategories: true    // Request categories in the same call
      });
      
      if (res.data) {
        const content = Array.isArray((res.data as unknown as ProductDTO[]))
          ? (res.data as unknown as ProductDTO[])
          : res.data.content || [];
        setInventoryProducts(content);
      }
    } catch (err) {
      console.error('Failed to load inventory products:', err);
    }
  };

  const addProductFromInventory = async (product: ProductDTO, quantity: number = 1, _expirationDate?: string | null) => {
    // Instead of performing a direct transfer, send a transfer request to Inventory
    setLoading(true);
    setError(null);
    try {
      const productId = typeof product.id === "string" ? parseInt(product.id) : product.id;

      const res = await transferRequestsApi.createRequest({
        items: [
          {
            productId,
            quantity,
          },
        ],
      });

      if (!res.data) {
        throw new Error(res.error || "Failed to send transfer request");
      }

      console.log("Transfer request created:", res.data);
      // No direct stock update here – Inventory will update quantities on approval
      // Show a lightweight confirmation toast for the Store user
      setRequestToast("Request sent to Inventory");
    } catch (err) {
      console.error("Transfer request error:", err);
      setError(err instanceof Error ? err.message : "Unable to send transfer request");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const adjustStoreQuantity = async (productId: number, quantity: number, isIncrease: boolean) => {
    // Don't set loading state - let the modal handle its own updates optimistically
    try {
      console.log(`Transferring quantity: productId=${productId}, quantity=${quantity}, isIncrease=${isIncrease}`);
      
      // Use TRANSFER endpoints instead of ADJUSTMENT endpoints
      // This ensures warehouse decreases when store increases, and vice versa
      const dto: StoreTransferRequestDTO = {
        productId: productId,
        quantity: Math.abs(quantity),
        notes: isIncrease 
          ? `Transferred ${quantity} units from warehouse to store` 
          : `Transferred ${quantity} units from store to warehouse`
      };
      
      let res;
      if (isIncrease) {
        // Transfer from warehouse to store (increases store, decreases warehouse)
        console.log('Transferring from warehouse to store...');
        res = await storeProductsApi.transferToStore(dto);
      } else {
        // Transfer from store to warehouse (decreases store, increases warehouse)
        console.log('Transferring from store to warehouse...');
        res = await storeProductsApi.transferToInventory(dto);
      }
      
      if (res.data) {
        console.log('Transfer successful');
        // Only refresh the main store products list (not the modal's inventory list)
        // The modal handles its own updates optimistically
        fetchStoreProducts(undefined, currentPage, undefined).catch(err => console.error('Failed to refresh store products:', err));
      } else {
        throw new Error(res.error || `Failed to transfer ${isIncrease ? 'to store' : 'to warehouse'}`);
      }
    } catch (err) {
      console.error('Transfer error:', err);
      // Don't set error state or alert - let the modal handle it
      throw err; // Re-throw so modal can handle the error
    }
  };

  const deleteStoreProduct = async (productId: string | number) => {
    setLoading(true);
    setError(null);
    try {
      const productIdNum = typeof productId === 'string' ? parseInt(productId) : productId;
      
      // First, get the current store quantity
      const stockRes = await storeProductsApi.getByProductId(productIdNum);
      if (!stockRes.data) {
        throw new Error(stockRes.error || 'Failed to get product stock information');
      }
      
      const currentStoreQty = (stockRes.data as any).storeQty || stockRes.data.storeQuantity || 0;
      
      if (currentStoreQty <= 0) {
        throw new Error('Product is not in store (store quantity is 0)');
      }
      
      // Transfer all store quantity back to warehouse
      const dto: StoreTransferRequestDTO = {
        productId: productIdNum,
        quantity: currentStoreQty, // Transfer all available quantity
        notes: `Removed from store, returned to warehouse`
      };
      
      console.log('Removing product from store:', dto);
      // Use transferToInventory instead of removeFromStore to avoid 400 error
      const res = await storeProductsApi.transferToInventory(dto);
      
      if (res.data) {
        console.log('Product removed successfully, refreshing lists...');
        // Refresh store products list
        await fetchStoreProducts(undefined, currentPage, undefined);
        console.log('Lists refreshed');
      } else {
        throw new Error(res.error || 'Failed to remove product from store');
      }
    } catch (err) {
      console.error('Remove error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unable to remove product from store';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    // Read current filters using functional state update to get latest values
    setFilters(currentFilters => {
      // Reset to first page when applying filters
      setCurrentPage(0);
      // Fetch with the current filters
      fetchStoreProducts(currentFilters, 0, undefined);
      return currentFilters; // Don't change state, just read it
    });
  };

  const handleResetFilters = () => {
    const resetFilters = {
      brand: '',
      sku: '',
      minPrice: '',
      maxPrice: '',
      isActive: ''
    };
    // Set filters state and immediately fetch with reset filters
    setFilters(resetFilters);
    setSortBy('none');
    setActiveCardFilter('all');
    setCurrentPage(0);
    // Fetch with empty filters immediately (don't wait for state update)
    fetchStoreProducts(resetFilters, 0, undefined);
  };

  // Fetch statistics from backend API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await storeProductsApi.getStats({
          brand: filters.brand || undefined,
          sku: filters.sku || undefined,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          isActive: filters.isActive === '' ? undefined : filters.isActive === 'true'
        });
        
        if (statsRes.data) {
          setStats({
            totalProducts: statsRes.data.totalProducts,
            lowStock: statsRes.data.lowStock,
            outOfStock: statsRes.data.outOfStock
          });
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    
    fetchStats();
  }, [filters]);

  // Initial load
  useEffect(() => {
    fetchStoreProducts(undefined, 0, undefined);
    fetchInventoryProducts();
  }, []); // initial load

  // Load products when filters or sort change
  useEffect(() => {
    setCurrentPage(0);
    fetchStoreProducts(undefined, 0, undefined);
  }, [sortBy]);

  // Get available inventory products (those with warehouseQuantity > 0 from stocks_snapshot)
  const getAvailableInventoryProducts = async (): Promise<(ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[]> => {
    try {
      console.log('Starting getAvailableInventoryProducts...');
      
      // Always get ALL products from products API and check individually
      // This ensures we get all products, not just those that have been in the store before
      console.log('Fetching all products from products API...');
      
      // Fetch all pages to get all products
      let allProducts: ProductDTO[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        // ✅ OPTIMIZED: Request stock quantities in the same call
        const pageRes = await productsApi.filter({
          page: page,
          size: pageSize,
          isActive: true,
          includeStock: true,        // Request stock quantities in the same call
          includeCategories: true    // Request categories in the same call
        });
        
        if (!pageRes.data) {
          console.error(`Error fetching page ${page}:`, pageRes.error);
          break;
        }
        
        const pageProducts = Array.isArray((pageRes.data as unknown as ProductDTO[]))
          ? (pageRes.data as unknown as ProductDTO[])
          : pageRes.data.content || [];
        
        // ✅ OPTIMIZED: Stock quantities are already in response, no individual API calls needed
        const productsWithStock = pageProducts.map((p) => {
          // Check both field name variations
          const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
          const storeQty = (p as any).storeQuantity ?? (p as any).storeQty ?? 0;
          
          return {
            ...p,
            warehouseQuantity: warehouseQty,
            storeQuantity: storeQty
          } as ProductDTO & { warehouseQuantity: number; storeQuantity: number };
        });
        
        allProducts = allProducts.concat(productsWithStock);
        console.log(`Fetched page ${page}: ${productsWithStock.length} products with stock (total so far: ${allProducts.length})`);
        
        // Check if there are more pages
        if (pageRes.data && typeof pageRes.data === 'object' && 'totalPages' in pageRes.data) {
          const totalPages = (pageRes.data as any).totalPages || 0;
          hasMore = page < totalPages - 1;
        } else {
          // If no pagination info, assume no more pages if we got less than pageSize
          hasMore = productsWithStock.length === pageSize;
        }
        
        page++;
      }
      
      console.log(`Found ${allProducts.length} total products with stock from products API`);
      return allProducts;
    } catch (err) {
      console.error('Failed to get available inventory products:', err);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative">
      {requestToast && (
        <div
          className="fixed top-4 right-4 z-[100]"
          style={{ animation: "fade-in 0.3s ease-out, slide-in-from-right 0.3s ease-out" }}
        >
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-4 py-3 shadow-lg flex items-start gap-3 min-w-[260px] max-w-[360px]">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-900 text-sm">{requestToast}</p>
              <p className="text-xs text-emerald-700 mt-1">
                Inventory Manager will approve or reject this request.
              </p>
            </div>
            <button
              onClick={() => setRequestToast(null)}
              className="flex-shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors text-sm font-semibold"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <PageHeader
        title="Store Operations"
        icon={<span className="text-2xl">🏪</span>}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => {
              const cleared = {
                brand: '',
                sku: '',
                minPrice: '',
                maxPrice: '',
                isActive: ''
              };
              setFilters(cleared);
              setActiveCardFilter('all');
              setSortBy('none');
              setCurrentPage(0);
              fetchStoreProducts(cleared, 0, undefined);
            }}
            className={`bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
              activeCardFilter === 'all' 
                ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md' 
                : 'border-indigo-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">Total Products</p>
                <p className="text-2xl font-bold text-indigo-900">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </button>
          
          <button
            onClick={() => {
              const cleared = {
                brand: '',
                sku: '',
                minPrice: '',
                maxPrice: '',
                isActive: ''
              };
              setFilters(cleared);
              setActiveCardFilter('lowStock');
              setSortBy('none');
              setCurrentPage(0);
              fetchStoreProducts(cleared, 0, undefined);
            }}
            className={`bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
              activeCardFilter === 'lowStock' 
                ? 'border-yellow-500 ring-2 ring-yellow-300 shadow-md' 
                : 'border-yellow-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.lowStock}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </button>
          
          <button
            onClick={() => {
              const cleared = {
                brand: '',
                sku: '',
                minPrice: '',
                maxPrice: '',
                isActive: ''
              };
              setFilters(cleared);
              setActiveCardFilter('outOfStock');
              setSortBy('none');
              setCurrentPage(0);
              fetchStoreProducts(cleared, 0, undefined);
            }}
            className={`bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
              activeCardFilter === 'outOfStock' 
                ? 'border-red-500 ring-2 ring-red-300 shadow-md' 
                : 'border-red-200/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-red-900">{stats.outOfStock}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </button>
        </div>
        
        <StoreManager 
          storeProducts={activeCardFilter === 'lowStock' 
            ? storeProducts.filter(p => {
                const storeQty = (p as any).storeQty || p.storeQuantity || 0;
                return storeQty > 0 && storeQty < 10;
              })
            : activeCardFilter === 'outOfStock'
            ? storeProducts.filter(p => {
                const storeQty = (p as any).storeQty || p.storeQuantity || 0;
                return storeQty === 0;
              })
            : storeProducts}
          inventoryProducts={inventoryProducts}
          onDelete={deleteStoreProduct}
          onAddFromInventory={addProductFromInventory}
          onAdjustQuantity={adjustStoreQuantity}
          loading={loading}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          getAvailableInventoryProducts={getAvailableInventoryProducts}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onFiltersChange={(newFilters) => setFilters(newFilters)}
          isFiltering={activeCardFilter !== 'all' || filters.brand !== '' || filters.sku !== '' || filters.minPrice !== '' || filters.maxPrice !== '' || filters.isActive !== ''}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalElements={totalElements}
          onPageChange={(page: number) => {
            setCurrentPage(page);
            fetchStoreProducts(undefined, page, undefined);
          }}
          onItemsPerPageChange={(size: number) => {
            setItemsPerPage(size);
            setCurrentPage(0);
            fetchStoreProducts(undefined, 0, size);
          }}
        />
      </div>
    </div>
  );
}
