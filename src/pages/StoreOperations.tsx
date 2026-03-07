import { useState, useEffect } from 'react';
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

  const fetchStoreProducts = async (filterOverrides?: typeof filters) => {
    try {
      setLoading(true);
      setError(null);
      // Use filterOverrides if provided, otherwise use current filters state
      const activeFilters = filterOverrides !== undefined ? filterOverrides : filters;
      const res = await storeProductsApi.filter({
        page: 0,
        size: 1000,
        brand: activeFilters.brand || undefined,
        sku: activeFilters.sku || undefined,
        minPrice: activeFilters.minPrice ? Number(activeFilters.minPrice) : undefined,
        maxPrice: activeFilters.maxPrice ? Number(activeFilters.maxPrice) : undefined,
        isActive: activeFilters.isActive === '' ? undefined : activeFilters.isActive === 'true'
      });
      
      if (res.data) {
        let content = res.data.content || [];
        
        // Fetch full product details for each store product to get correct name, price, etc.
        const normalizedResults: (UIStoreProduct | null)[] = await Promise.all(
          content.map(async (p): Promise<UIStoreProduct | null> => {
            // Use warehouseQty/storeQty if warehouseQuantity/storeQuantity is not available
            const warehouseQty = (p as any).warehouseQty || p.warehouseQuantity || 0;
            const storeQty = (p as any).storeQty || p.storeQuantity || 0;
            
            // Only process products that have storeQuantity > 0 (products actually in the store)
            if (storeQty <= 0) {
              return null;
            }
            
            // Get full product details from products API
            try {
              const productRes = await productsApi.getById(p.productId);
              if (productRes.data) {
                const fullProduct = productRes.data;
                
                // Extract image URL - priority: images array > primaryImageUrl > imageUrl
                let imageUrl: string | null | undefined = null;
                if (fullProduct.images && Array.isArray(fullProduct.images) && fullProduct.images.length > 0) {
                  const primaryImage = fullProduct.images.find((img: any) => img.isPrimary) || fullProduct.images[0];
                  if (primaryImage?.url) {
                    imageUrl = productsApi.normalizeImageUrl(primaryImage.url, fullProduct.id);
                  }
                }
                if (!imageUrl && fullProduct.primaryImageUrl) {
                  imageUrl = productsApi.normalizeImageUrl(fullProduct.primaryImageUrl, fullProduct.id);
                }
                if (!imageUrl && fullProduct.imageUrl) {
                  imageUrl = productsApi.normalizeImageUrl(fullProduct.imageUrl, fullProduct.id);
                }
                
                // Extract category name
                let categoryName: string | undefined;
                if (typeof fullProduct.category === 'string') {
                  categoryName = fullProduct.category;
                } else if (fullProduct.category && typeof fullProduct.category === 'object') {
                  const catObj = fullProduct.category as any;
                  categoryName = catObj.name || catObj.title;
                }
                
                const result: UIStoreProduct = {
                  ...p,
                  productName: fullProduct.name || p.productName,
                  price: fullProduct.price || fullProduct.defaultPrice || p.price || 0,
                  cost: fullProduct.cost || fullProduct.defaultCost || p.cost,
                  category: categoryName || p.category,
                  imageUrl: imageUrl || p.imageUrl || null,
                  primaryImageUrl: fullProduct.primaryImageUrl || p.primaryImageUrl,
                  images: fullProduct.images || p.images,
                  warehouseQuantity: warehouseQty,
                  storeQuantity: storeQty,
                  orders: (fullProduct as any).orders || (p as any).orders || 0,
                  createdAt: fullProduct.createdAt,
                  updatedAt: fullProduct.updatedAt,
                  sales: (fullProduct as any).sales || (p as any).sales || 0
                };
                return result;
              }
            } catch (err) {
              console.error(`Failed to get full product details for ${p.productId}:`, err);
            }
            
            // Fallback to store product data if full product fetch fails
            let imageUrl: string | null | undefined = p.imageUrl;
            if (!imageUrl && p.primaryImageUrl) {
              imageUrl = p.primaryImageUrl;
            }
            if (!imageUrl && p.images && Array.isArray(p.images) && p.images.length > 0) {
              const primaryImage = p.images.find((img: any) => img.isPrimary) || p.images[0];
              imageUrl = primaryImage?.url;
            }
            
            const result: UIStoreProduct = {
              ...p,
              imageUrl: imageUrl || p.imageUrl || null,
              warehouseQuantity: warehouseQty,
              storeQuantity: storeQty
            };
            return result;
          })
        );
        
        // Filter out null values (products with storeQty <= 0)
        let normalized = normalizedResults.filter((p): p is UIStoreProduct => p !== null);
        
        // Apply sorting by sales (most sold)
        if (sortBy === 'sales') {
          normalized.sort((a, b) => {
            const salesA = (a as any).sales || (a as any).orders || 0;
            const salesB = (b as any).sales || (b as any).orders || 0;
            return salesB - salesA; // Most sold first
          });
        }
        
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
      const res = await productsApi.filter({
        page: 0,
        size: 1000,
        isActive: true
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
        fetchStoreProducts().catch(err => console.error('Failed to refresh store products:', err));
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
        // Refresh both lists
        await Promise.all([
          fetchStoreProducts(),
          getAvailableInventoryProducts().then(products => {
            setInventoryProducts(products);
          })
        ]);
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
      // Fetch with the current filters
      fetchStoreProducts(currentFilters);
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
    // Fetch with empty filters immediately (don't wait for state update)
    fetchStoreProducts(resetFilters);
  };

  // Load products on mount and when filters or sort change
  useEffect(() => {
    fetchStoreProducts();
    fetchInventoryProducts();
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
        const pageRes = await productsApi.filter({
          page: page,
          size: pageSize,
          isActive: true
        });
        
        if (!pageRes.data) {
          console.error(`Error fetching page ${page}:`, pageRes.error);
          break;
        }
        
        const pageProducts = Array.isArray((pageRes.data as unknown as ProductDTO[]))
          ? (pageRes.data as unknown as ProductDTO[])
          : pageRes.data.content || [];
        
        allProducts = allProducts.concat(pageProducts);
        console.log(`Fetched page ${page}: ${pageProducts.length} products (total so far: ${allProducts.length})`);
        
        // Check if there are more pages
        if (pageRes.data && typeof pageRes.data === 'object' && 'totalPages' in pageRes.data) {
          const totalPages = (pageRes.data as any).totalPages || 0;
          hasMore = page < totalPages - 1;
        } else {
          // If no pagination info, assume no more pages if we got less than pageSize
          hasMore = pageProducts.length === pageSize;
        }
        
        page++;
      }
      
      console.log(`Found ${allProducts.length} total products from products API`);
      
      if (allProducts.length === 0) {
        console.warn('No products found from products API');
        return [];
      }
      
      // Check warehouse quantity for each product from stock_snapshot
      const productsWithWarehouseStock: (ProductDTO & { warehouseQuantity: number; storeQuantity: number })[] = [];
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 20;
      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            try {
              const stockRes = await storeProductsApi.getByProductId(product.id);
              
              // API returns warehouseQty (lowercase) not warehouseQuantity
              let warehouseQty = 0;
              let storeQty = 0;
              
              if (stockRes.data) {
                warehouseQty = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
                storeQty = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
              } else if (stockRes.error) {
                // If error getting stock (e.g., product not in stock_snapshot), use 0 quantities
                console.warn(`No stock data for product ${product.id}:`, stockRes.error);
              }
              
              // Include ALL products (even if warehouseQty is 0, as user requested)
              return {
                ...product,
                warehouseQuantity: warehouseQty,
                storeQuantity: storeQty
              } as ProductDTO & { warehouseQuantity: number; storeQuantity: number };
            } catch (err) {
              // If error, still include product with 0 quantities
              console.warn(`Error checking product ${product.id}:`, err);
              return {
                ...product,
                warehouseQuantity: 0,
                storeQuantity: 0
              } as ProductDTO & { warehouseQuantity: number; storeQuantity: number };
            }
          })
        );
        
        // Filter out null results and add to main array
        const validProducts = batchResults.filter((p): p is ProductDTO & { warehouseQuantity: number; storeQuantity: number } => p !== null);
        productsWithWarehouseStock.push(...validProducts);
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)}, found ${validProducts.length} products with warehouse stock in this batch`);
      }
      
      console.log(`Found ${productsWithWarehouseStock.length} total products with warehouse stock available`);
      return productsWithWarehouseStock;
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
        
        <StoreManager 
          storeProducts={storeProducts}
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
        />
      </div>
    </div>
  );
}
