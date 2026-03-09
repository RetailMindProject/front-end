import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductDTO } from '../../services/products.api';
import { productsApi } from '../../services/products.api';
import AuthenticatedImage from './AuthenticatedImage';

interface Product {
  id: string | number;
  sku?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  cost?: number;
  price: number;
  wholesalePrice?: number;
  unit?: string;
  image?: string | null;
  imageUrl?: string | null;
  primaryImageUrl?: string | null;
}

interface AddProductFromInventoryModalProps {
  inventoryProducts: ProductDTO[];
  storeProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: ProductDTO, quantity: number, expirationDate?: string | null) => void | Promise<void>;
  onAdjustQuantity?: (productId: number, quantity: number, isIncrease: boolean) => Promise<void>;
  getAvailableInventoryProducts?: () => Promise<(ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[]>;
}

const AddProductFromInventoryModal = ({ 
  inventoryProducts, 
  storeProducts: _storeProducts, 
  isOpen, 
  onClose, 
  onSelect,
  onAdjustQuantity: _onAdjustQuantity,
  getAvailableInventoryProducts
}: AddProductFromInventoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<(ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(ProductDTO & { warehouseQuantity?: number; storeQuantity?: number }) | null>(null);
  const [quantity, setQuantity] = useState<string>('1');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track pending transfer quantities (productId -> quantity to transfer)
  const [pendingQuantities, setPendingQuantities] = useState<Map<number | string, number>>(new Map());
  // Track quantity input values for each product (productId -> input value string)
  const [quantityInputs, setQuantityInputs] = useState<Map<number | string, string>>(new Map());
  // Track expiration dates for each product (productId -> expiration date string)
  const [expirationDates, setExpirationDates] = useState<Map<number | string, string>>(new Map());
  // Track whether expiration date is enabled for each product (productId -> boolean)
  const [hasExpirationDate, setHasExpirationDate] = useState<Map<number | string, boolean>>(new Map());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // ✅ Backend pagination: Use products directly from API response (no client-side pagination)
  const displayProducts = isSearching ? searchResults : availableProducts;
  const currentPage = page;

  useEffect(() => {
    if (isOpen) {
      setPage(0); // Reset to first page when modal opens
      setSearchTerm('');
      setSearchResults([]);
      setIsSearching(false);
      // Clear pending quantities, inputs, and expiration dates when modal opens
      setPendingQuantities(new Map());
      setQuantityInputs(new Map());
      setExpirationDates(new Map());
      setHasExpirationDate(new Map());
      // Load products with backend pagination
      loadAvailableProducts(false, 0, pageSize);
    }
  }, [isOpen, inventoryProducts]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Note: Page size changes are handled in the select onChange handler
  // This useEffect is not needed as page size changes trigger reload directly

  const loadAvailableProducts = async (preserveScroll = false, pageOverride?: number, sizeOverride?: number) => {
    // Save scroll position before loading
    if (preserveScroll && scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    
    setLoading(true);
    try {
      const currentPage = pageOverride !== undefined ? pageOverride : page;
      const currentSize = sizeOverride !== undefined ? sizeOverride : pageSize;
      
      if (getAvailableInventoryProducts) {
        // Use the provided function - but this should ideally also support pagination
        // For now, we'll use it but note that it might not be paginated
        const products = await getAvailableInventoryProducts() as (ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[];
        setAvailableProducts(products);
        setTotalPages(1);
        setTotalElements(products.length);
      } else {
        // ✅ OPTIMIZED: Use backend pagination, filtering, and sorting
        const { productsApi } = await import('../../services/products.api');
        const res = await productsApi.filter({
          page: currentPage,
          size: currentSize,
          isActive: true,
          // Removed minWarehouseQuantity: 1 to show all products (including zero stock)
          sort: 'warehouseQuantity_with_zero_last',  // ✅ Backend sorting: products with stock first, zero stock at bottom
          includeStock: true,        // Request stock quantities in the same call
          includeCategories: true     // Request categories in the same call
        });
        
        if (res.data) {
          // Handle paginated response
          let content: ProductDTO[] = [];
          let totalPagesValue = 0;
          let totalElementsValue = 0;
          
          if (typeof res.data === 'object' && 'content' in res.data) {
            const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number; number: number; size: number };
            content = pageData.content || [];
            totalPagesValue = pageData.totalPages || 0;
            totalElementsValue = pageData.totalElements || 0;
          } else if (Array.isArray(res.data)) {
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
          
          // ✅ OPTIMIZED: Data is already filtered and sorted by backend
          // Map to add category names and normalize data
          const productsWithCategories = content.map((p) => {
            const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
            const storeQty = (p as any).storeQuantity ?? (p as any).storeQty ?? 0;
            
            // ✅ FIXED: Extract category like InventoryOperations (use first category, not subcategory)
            let categoryName: string | undefined;
            if (Array.isArray(p.categories) && p.categories.length > 0) {
              categoryName = p.categories[0].name;
            } else if (typeof p.category === 'string' && p.category.trim()) {
              categoryName = p.category;
            } else if (p.category && typeof p.category === 'object') {
              const catObj = p.category as any;
              categoryName = catObj.name || (catObj.category?.name);
            }
            
            return {
              ...p,
              warehouseQuantity: warehouseQty,
              storeQuantity: storeQty,
              category: categoryName,
            };
          });
          
          // ✅ CLIENT-SIDE SORTING: Products with warehouseQuantity > 0 first, then zero stock at bottom
          // This ensures zero stock products appear at the bottom even if backend doesn't sort correctly
          const sortedProducts = [...productsWithCategories].sort((a, b) => {
            const aQty = a.warehouseQuantity || 0;
            const bQty = b.warehouseQuantity || 0;
            
            // If both have stock or both are zero, maintain backend order (or sort by quantity DESC)
            if ((aQty > 0 && bQty > 0) || (aQty === 0 && bQty === 0)) {
              return bQty - aQty; // Higher quantity first
            }
            
            // Products with stock come before products with zero stock
            return bQty > 0 ? 1 : -1;
          });
          
          setAvailableProducts(sortedProducts);
        } else {
          setAvailableProducts([]);
          setTotalPages(0);
          setTotalElements(0);
        }
      }
      
      // Restore scroll position after a brief delay to allow DOM to update
      if (preserveScroll) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollPositionRef.current;
          }
        }, 50);
      }
    } catch (err) {
      console.error('Failed to load available products:', err);
      setAvailableProducts([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Debounced search function
  const performSearch = async (searchValue: string, pageOverride?: number, sizeOverride?: number) => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setPage(0);
      return;
    }
    
    setIsSearching(true);
    setLoading(true);
    try {
      // ✅ OPTIMIZED: Use backend search with pagination (no client-side filtering)
      const searchTerm = searchValue.trim();
      const currentPage = pageOverride !== undefined ? pageOverride : page;
      const currentSize = sizeOverride !== undefined ? sizeOverride : pageSize;
      
      // Use backend search parameter - backend handles case-insensitive search
      const filterParams = {
        page: currentPage,
        size: currentSize,
        isActive: true,
        search: searchTerm,  // ✅ Backend search: search by name or SKU (case-insensitive on backend)
        // Removed minWarehouseQuantity: 1 to show all products in search (including zero stock)
        sort: 'warehouseQuantity_with_zero_last',  // ✅ Backend sorting: products with stock first, zero stock at bottom
        includeStock: true,        // Request stock quantities in the same call
        includeCategories: true    // Request categories in the same call
      };
      
      console.log('🔍 Search API call params:', filterParams);
      const res = await productsApi.filter(filterParams);
      console.log('🔍 Search API response:', res);
      console.log('🔍 Search API response.data:', res.data);
      console.log('🔍 Search API response.data type:', typeof res.data);
      console.log('🔍 Search API response.data keys:', res.data ? Object.keys(res.data) : 'no data');
      
      if (res.data) {
        // Handle paginated response
        let content: ProductDTO[] = [];
        let totalPagesValue = 0;
        let totalElementsValue = 0;
        
        // Check if data is an empty object (backend returns {} when no results)
        if (typeof res.data === 'object' && Object.keys(res.data).length === 0) {
          console.log('🔍 Empty response object detected, setting empty results');
          content = [];
          totalPagesValue = 0;
          totalElementsValue = 0;
        } else if (typeof res.data === 'object' && 'content' in res.data) {
          const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number; number: number; size: number };
          content = pageData.content || [];
          totalPagesValue = pageData.totalPages || 0;
          totalElementsValue = pageData.totalElements || 0;
          console.log('🔍 Paginated response - content:', content.length, 'totalPages:', totalPagesValue, 'totalElements:', totalElementsValue);
        } else if (Array.isArray(res.data)) {
          content = res.data as ProductDTO[];
          totalPagesValue = 1;
          totalElementsValue = content.length;
          console.log('🔍 Array response - content:', content.length);
        } else {
          content = (res.data as any).content || [];
          totalPagesValue = (res.data as any).totalPages || 0;
          totalElementsValue = (res.data as any).totalElements || 0;
          console.log('🔍 Fallback response - content:', content.length);
        }
        
        setTotalPages(totalPagesValue);
        setTotalElements(totalElementsValue);
        
        // ✅ OPTIMIZED: Data is already filtered, sorted, and paginated by backend
        // Map to add category names and normalize data
        const productsWithInventory = content.map((p) => {
          const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
          const storeQty = (p as any).storeQuantity ?? (p as any).storeQty ?? 0;
          
          // ✅ FIXED: Extract category like InventoryOperations (use first category, not subcategory)
          let categoryName: string | undefined;
          if (Array.isArray(p.categories) && p.categories.length > 0) {
            categoryName = p.categories[0].name;
          } else if (typeof p.category === 'string' && p.category.trim()) {
            categoryName = p.category;
          } else if (p.category && typeof p.category === 'object') {
            const catObj = p.category as any;
            categoryName = catObj.name || (catObj.category?.name);
          }
          
          return {
            ...p,
            warehouseQuantity: warehouseQty,
            storeQuantity: storeQty,
            category: categoryName,
          };
        });
        
        // ✅ CLIENT-SIDE SORTING: Products with warehouseQuantity > 0 first, then zero stock at bottom
        // This ensures zero stock products appear at the bottom even if backend doesn't sort correctly
        const sortedSearchResults = [...productsWithInventory].sort((a, b) => {
          const aQty = a.warehouseQuantity || 0;
          const bQty = b.warehouseQuantity || 0;
          
          // If both have stock or both are zero, maintain backend order (or sort by quantity DESC)
          if ((aQty > 0 && bQty > 0) || (aQty === 0 && bQty === 0)) {
            return bQty - aQty; // Higher quantity first
          }
          
          // Products with stock come before products with zero stock
          return bQty > 0 ? 1 : -1;
        });
        
        setSearchResults(sortedSearchResults);
        console.log('🔍 Search results set:', productsWithInventory.length, 'products');
      } else {
        console.warn('🔍 Search API returned no data. Error:', res.error);
        setSearchResults([]);
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      console.error('🔍 Search failed with exception:', err);
      setSearchResults([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      if (value.trim()) {
        setPage(0); // Reset to first page when searching
        setIsSearching(true);
        performSearch(value, 0, pageSize);
      } else {
        setSearchResults([]);
        setIsSearching(false);
        setPage(0);
        // Reload available products when search is cleared
        loadAvailableProducts(false, 0, pageSize);
      }
    }, 300); // 300ms debounce delay
  };

  const handleSelect = async (product: ProductDTO & { warehouseQuantity?: number; storeQuantity?: number }, qtyOverride?: number) => {
    const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
    // Get quantity from input field, pending quantity, or override
    const inputQty = quantityInputs.get(productId);
    const pendingQty = pendingQuantities.get(productId) || 0;
    let qty: number;
    
    if (qtyOverride !== undefined) {
      qty = qtyOverride;
    } else if (inputQty && inputQty.trim() !== '') {
      qty = parseInt(inputQty) || 0;
    } else if (pendingQty > 0) {
      qty = pendingQty;
    } else {
      qty = 1;
    }
    
    const maxQty = product.warehouseQuantity || 0;
    
    if (qty <= 0) {
      alert('Please enter a valid quantity');
      return;
    }
    if (qty > maxQty) {
      alert(`Cannot transfer more than ${maxQty} units (available in warehouse)`);
      return;
    }
    try {
      // Get expiration date if enabled for this product
      const expirationDateEnabled = hasExpirationDate.get(productId) || false;
      const expirationDateValue = expirationDateEnabled ? (expirationDates.get(productId) || null) : null;
      
      await onSelect(product, qty, expirationDateValue);
      // Clear pending quantity, input, and expiration date for this product after successful transfer
      setPendingQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });
      setQuantityInputs(prev => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });
      setExpirationDates(prev => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });
      setHasExpirationDate(prev => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });
      // Reload products to refresh quantities
      await loadAvailableProducts();
      // Only close modal if not a quick transfer (quantity input form)
      if (!qtyOverride && pendingQty === 0 && !inputQty) {
        onClose();
        setSearchTerm('');
        setSearchResults([]);
        setIsSearching(false);
        setSelectedProduct(null);
        setQuantity('1');
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      alert(err instanceof Error ? err.message : 'Transfer failed');
      // Don't close modal on error so user can try again
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">Add Product from Inventory</h2>
          <button 
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden px-6 py-6">
          {selectedProduct ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="flex-shrink-0">
                  {(() => {
                    const imageUrl = selectedProduct.imageUrl || selectedProduct.primaryImageUrl || 
                      (selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[0].url : null);
                    let normalizedUrl = imageUrl;
                    if (imageUrl && !imageUrl.startsWith('http') && selectedProduct.id) {
                      normalizedUrl = productsApi.normalizeImageUrl(imageUrl, selectedProduct.id);
                    }
                    return normalizedUrl ? (
                      <AuthenticatedImage
                        src={normalizedUrl}
                        alt={selectedProduct.name}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                        fallbackIcon={
                          <div className="w-20 h-20 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                            <span className="text-3xl">📦</span>
                          </div>
                        }
                      />
                    ) : (
                      <div className="w-20 h-20 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                        <span className="text-3xl">📦</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-800 mb-1">{selectedProduct.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{typeof selectedProduct.category === 'string' ? selectedProduct.category : 'No category'}</span>
                    <span className="font-medium text-blue-600">${(selectedProduct.price || 0).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse Quantity</label>
                    <p className="text-lg font-semibold text-blue-600">{selectedProduct.warehouseQuantity || 0}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Current Store Quantity</label>
                    <p className="text-lg font-semibold text-green-600">{selectedProduct.storeQuantity || 0}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity to Transfer <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.warehouseQuantity || 0}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter the quantity to transfer from warehouse to store (max: {selectedProduct.warehouseQuantity || 0})
                  </p>
                </div>

                {/* Expiration Date Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="hasExpirationDateSelected"
                      checked={hasExpirationDate.get(selectedProduct.id) || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const productId = typeof selectedProduct.id === 'string' ? parseInt(selectedProduct.id) : selectedProduct.id;
                        setHasExpirationDate(prev => {
                          const newMap = new Map(prev);
                          if (checked) {
                            newMap.set(productId, true);
                          } else {
                            newMap.delete(productId);
                            // Clear expiration date when unchecked
                            setExpirationDates(prev => {
                              const newMap2 = new Map(prev);
                              newMap2.delete(productId);
                              return newMap2;
                            });
                          }
                          return newMap;
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="hasExpirationDateSelected" className="text-sm font-medium text-slate-700">
                      Set expiration date
                    </label>
                  </div>
                  
                  {hasExpirationDate.get(selectedProduct.id) && (
                    <div>
                      <label htmlFor="expirationDateSelected" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Expiration Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        id="expirationDateSelected"
                        value={expirationDates.get(selectedProduct.id) || ''}
                        onChange={(e) => {
                          const productId = typeof selectedProduct.id === 'string' ? parseInt(selectedProduct.id) : selectedProduct.id;
                          setExpirationDates(prev => {
                            const newMap = new Map(prev);
                            if (e.target.value) {
                              newMap.set(productId, e.target.value);
                            } else {
                              newMap.delete(productId);
                            }
                            return newMap;
                          });
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleSelect(selectedProduct)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Transfer to Store
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex-shrink-0">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search inventory products..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="mt-2 text-sm text-slate-600">
                  {loading ? 'Loading available products...' :
                   isSearching 
                ? `${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found`
                    : `${availableProducts.length} available product${availableProducts.length !== 1 ? 's' : ''} (with warehouse stock)`
              }
            </p>
          </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-3"></div>
                  <p className="text-slate-600">Loading available products...</p>
                </div>
              ) : displayProducts.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {displayProducts.map(product => {
                    const imageUrl = product.imageUrl || product.primaryImageUrl || 
                      (product.images && product.images.length > 0 ? product.images[0].url : null);
                    const warehouseQty = product.warehouseQuantity || 0;
                    const storeQty = product.storeQuantity || 0;
                    const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
                    
                    return (
                <div 
                  key={product.id} 
                        className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {(() => {
                      let normalizedUrl = imageUrl;
                      if (imageUrl && !imageUrl.startsWith('http') && product.id) {
                        normalizedUrl = productsApi.normalizeImageUrl(imageUrl, product.id);
                      }
                      return normalizedUrl ? (
                        <AuthenticatedImage
                          src={normalizedUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-md border border-slate-200"
                          fallbackIcon={
                            <div className="w-12 h-12 bg-amber-100 border border-amber-200 rounded-md flex items-center justify-center">
                              <span className="text-lg">📦</span>
                            </div>
                          }
                        />
                      ) : (
                        <div className="w-12 h-12 bg-amber-100 border border-amber-200 rounded-md flex items-center justify-center">
                          <span className="text-lg">📦</span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 mb-0.5">{product.name || 'Unknown Product'}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-600 mb-1.5">
                            <span>
                              {product.category || 'No category'}
                            </span>
                            <span className="font-medium text-blue-600">
                              ${((product.price || product.defaultPrice || 0) > 0 ? (product.price || product.defaultPrice || 0) : 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-500">
                              Warehouse: <span className="font-semibold text-blue-600">{warehouseQty}</span>
                            </span>
                            <span className="text-slate-500">
                              Store: <span className="font-semibold text-green-600">{storeQty}</span>
                            </span>
                    </div>
                  </div>
                  
                        <div className="flex-shrink-0 flex items-center gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              
                              const currentInput = quantityInputs.get(productId) || '';
                              const currentValue = parseInt(currentInput) || 0;
                              
                              if (currentValue <= 0) return;
                              
                              // Decrease quantity input (local only, no API call)
                              const newValue = Math.max(0, currentValue - 1);
                              setQuantityInputs(prev => {
                                const newMap = new Map(prev);
                                if (newValue > 0) {
                                  newMap.set(productId, String(newValue));
                                } else {
                                  newMap.delete(productId);
                                }
                                return newMap;
                              });
                            }}
                            disabled={(parseInt(quantityInputs.get(productId) || '0') || 0) <= 0}
                            className="px-2 py-1.5 bg-red-100 hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-red-700 font-medium rounded-md transition-colors text-xs"
                            title="Decrease quantity"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={warehouseQty}
                            value={quantityInputs.get(productId) || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setQuantityInputs(prev => {
                                const newMap = new Map(prev);
                                if (value.trim() === '') {
                                  newMap.delete(productId);
                                } else {
                                  const numValue = parseInt(value) || 0;
                                  if (numValue >= 0 && numValue <= warehouseQty) {
                                    newMap.set(productId, value);
                                  }
                                }
                                return newMap;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-12 px-1.5 py-1.5 text-center border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            placeholder="0"
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              
                              if (warehouseQty <= 0) return;
                              
                              const currentInput = quantityInputs.get(productId) || '';
                              const currentValue = parseInt(currentInput) || 0;
                              const maxAvailable = warehouseQty;
                              
                              // Increase quantity input (local only, no API call)
                              // Don't allow more than available in warehouse
                              if (currentValue < maxAvailable) {
                                setQuantityInputs(prev => {
                                  const newMap = new Map(prev);
                                  newMap.set(productId, String(currentValue + 1));
                                  return newMap;
                                });
                              }
                            }}
                            disabled={warehouseQty <= 0 || (parseInt(quantityInputs.get(productId) || '0') || 0) >= warehouseQty}
                            className="px-2 py-1.5 bg-green-100 hover:bg-green-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-green-700 font-medium rounded-md transition-colors text-xs"
                            title="Increase quantity"
                          >
                            +
                          </button>
                    <button 
                            onClick={async (e) => {
                        e.stopPropagation();
                              // Transfer with quantity from input (or 1 if no input)
                              await handleSelect(product);
                      }}
                            disabled={warehouseQty <= 0}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors text-xs"
                            title="Transfer to store"
                    >
                            Transfer
                    </button>
                  </div>
                </div>
                    );
                  })}
                  </div>

                  {/* Pagination Controls */}
                  {(
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Rows per page:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            const newSize = Number(e.target.value);
                            setPageSize(newSize);
                            setPage(0);
                            // Reload with new page size
                            if (isSearching && searchTerm.trim()) {
                              performSearch(searchTerm, 0, newSize);
                            } else {
                              loadAvailableProducts(false, 0, newSize);
                            }
                          }}
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 cursor-pointer"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          Page {currentPage + 1} of {totalPages} {totalElements > 0 && `(${totalElements} total)`}
                        </span>
                        <div className="inline-flex rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
                          <button
                            onClick={() => {
                              const newPage = Math.max(0, page - 1);
                              setPage(newPage);
                              if (isSearching && searchTerm.trim()) {
                                performSearch(searchTerm, newPage, pageSize);
                              } else {
                                loadAvailableProducts(false, newPage, pageSize);
                              }
                            }}
                            disabled={currentPage === 0}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            title="Previous page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const newPage = Math.min(totalPages - 1, page + 1);
                              setPage(newPage);
                              if (isSearching && searchTerm.trim()) {
                                performSearch(searchTerm, newPage, pageSize);
                              } else {
                                loadAvailableProducts(false, newPage, pageSize);
                              }
                            }}
                            disabled={currentPage >= totalPages - 1}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 border-l border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            title="Next page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-2">No products available to add.</p>
              <p className="text-sm text-slate-500">
                {availableProducts.length === 0 && inventoryProducts.length > 0
                      ? 'No products in warehouse with available stock, or all products are already in the store.'
                  : 'No products in inventory.'}
              </p>
            </div>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center justify-end px-6 py-4 border-t bg-slate-50/50">
          <button 
            className="px-6 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductFromInventoryModal;
