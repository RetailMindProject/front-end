import { useMemo, useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { ProductDTO } from '../../services/products.api';
import { storeProductsApi } from '../../services/store-products.api';
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

  const displayProducts = isSearching ? searchResults : availableProducts;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(displayProducts.length / pageSize)), [displayProducts.length, pageSize]);
  const currentPage = Math.min(page, totalPages - 1);
  const pagedProducts = useMemo(() => {
    const start = currentPage * pageSize;
    return displayProducts.slice(start, start + pageSize);
  }, [currentPage, displayProducts, pageSize]);

  useEffect(() => {
    if (isOpen) {
      loadAvailableProducts();
      // Clear pending quantities, inputs, and expiration dates when modal opens
      setPendingQuantities(new Map());
      setQuantityInputs(new Map());
      setExpirationDates(new Map());
      setHasExpirationDate(new Map());
    }
  }, [isOpen, inventoryProducts]);

  useEffect(() => {
    setPage(0);
  }, [isSearching, searchTerm, pageSize]);

  const loadAvailableProducts = async (preserveScroll = false) => {
    // Save scroll position before loading
    if (preserveScroll && scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    
    setLoading(true);
    try {
      let products: (ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[] = [];
      
      if (getAvailableInventoryProducts) {
        // Use the provided function to get products with warehouseQuantity > 0 from stocks_snapshot
        products = await getAvailableInventoryProducts() as (ProductDTO & { warehouseQuantity?: number; storeQuantity?: number })[];
      } else {
        // Fallback: Get all products and check their warehouse quantities
        try {
          const { productsApi } = await import('../../services/products.api');
          const allProductsRes = await productsApi.filter({
            page: 0,
            size: 1000,
            isActive: true
          });
          
          if (allProductsRes.data) {
            const allProducts = Array.isArray((allProductsRes.data as unknown as ProductDTO[]))
              ? (allProductsRes.data as unknown as ProductDTO[])
              : allProductsRes.data.content || [];
            
            // Check warehouse quantity for each product
            for (const product of allProducts) {
              try {
                const stockRes = await storeProductsApi.getByProductId(product.id);
                if (stockRes.data && (stockRes.data.warehouseQuantity ?? 0) > 0) {
                  products.push({
                    ...product,
                    warehouseQuantity: stockRes.data.warehouseQuantity,
                    storeQuantity: stockRes.data.storeQuantity
                  });
                }
              } catch (err) {
                // If product not found in stock_snapshot, skip it
                continue;
              }
            }
          }
        } catch (err) {
          console.error('Failed to load products from API:', err);
        }
      }
      
      // Sort products by warehouseQuantity descending (highest first)
      products.sort((a, b) => {
        const aQty = a.warehouseQuantity || 0;
        const bQty = b.warehouseQuantity || 0;
        return bQty - aQty; // Descending order
      });
      
      // Fetch categories for all products in parallel
      const productsWithCategories = await Promise.all(
        products.map(async (p) => {
          let categoryName: string | undefined = typeof p.category === 'string' 
            ? p.category 
            : undefined;
          
          // Fetch category from product categories endpoint if not already available
          if (!categoryName && p.id) {
            try {
              const catRes = await productsApi.getProductCategories(p.id);
              if (catRes.data && catRes.data.length > 0) {
                // Sort categories by ID for consistency
                const sortedCategories = [...catRes.data].sort((a, b) => a.id - b.id);
                // Find subcategory (one with parentId) or use first one
                const subCategory = sortedCategories.find(cat => cat.parentId !== null && cat.parentId !== undefined) || sortedCategories[0];
                categoryName = subCategory.name;
              }
            } catch (err) {
              console.error(`Failed to load category for product ${p.id}:`, err);
            }
          }
          
          // Extract category from nested structure if needed
          if (!categoryName && p.category && typeof p.category === 'object') {
            const catObj = p.category as any;
            categoryName = catObj.name || catObj.title;
          }
          
          return {
            ...p,
            category: categoryName,
          };
        })
      );
      
      // Add originalIndex to maintain order during updates
      const productsWithIndex = productsWithCategories.map((p, index) => ({
        ...p,
        originalIndex: index
      }));
      
      // Show ALL products with warehouse stock (no filtering by store quantity)
      setAvailableProducts(productsWithIndex);
      
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
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      const results = availableProducts.filter(product =>
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(value.toLowerCase())) ||
        (product.category && typeof product.category === 'string' && product.category.toLowerCase().includes(value.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(value.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(value.toLowerCase()))
      );
      // Sort search results by originalIndex to maintain order from availableProducts
      results.sort((a, b) => {
        const aIdx = (a as any).originalIndex ?? 0;
        const bIdx = (b as any).originalIndex ?? 0;
        return aIdx - bIdx; // Maintain original order
      });
      setSearchResults(results);
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
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
                <div className="text-center py-12">
                  <p className="text-slate-600">Loading available products...</p>
                </div>
              ) : displayProducts.length > 0 ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {pagedProducts.map(product => {
                    const imageUrl = product.imageUrl || product.primaryImageUrl || 
                      (product.images && product.images.length > 0 ? product.images[0].url : null);
                    const warehouseQty = product.warehouseQuantity || 0;
                    const storeQty = product.storeQuantity || 0;
                    const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
                    
                    return (
                <div 
                  key={product.id} 
                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-colors"
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
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                          fallbackIcon={
                            <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">📦</span>
                            </div>
                          }
                        />
                      ) : (
                        <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-slate-800 mb-1">{product.name || 'Unknown Product'}</h4>
                          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                            <span>
                              {(() => {
                                if (typeof product.category === 'string') return product.category;
                                if (product.category && typeof product.category === 'object') {
                                  const cat = product.category as any;
                                  return cat.name || cat.title || 'No category';
                                }
                                return 'No category';
                              })()}
                            </span>
                            <span className="font-medium text-blue-600">
                              ${((product.price || product.defaultPrice || 0) > 0 ? (product.price || product.defaultPrice || 0) : 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-500">
                              Warehouse: <span className="font-semibold text-blue-600">{warehouseQty}</span>
                            </span>
                            <span className="text-slate-500">
                              Store: <span className="font-semibold text-green-600">{storeQty}</span>
                            </span>
                    </div>
                  </div>
                  
                        <div className="flex-shrink-0 flex items-center gap-2">
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
                            className="px-3 py-2 bg-red-100 hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-red-700 font-medium rounded-lg transition-colors"
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
                            className="w-16 px-2 py-2 text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                            className="px-3 py-2 bg-green-100 hover:bg-green-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-green-700 font-medium rounded-lg transition-colors"
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
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                            title="Transfer to store"
                    >
                            Transfer
                    </button>
                  </div>
                </div>
                    );
                  })}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">
                      Showing{" "}
                      <span className="font-semibold text-slate-900">
                        {displayProducts.length === 0 ? 0 : currentPage * pageSize + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-slate-900">
                        {Math.min((currentPage + 1) * pageSize, displayProducts.length)}
                      </span>{" "}
                      of <span className="font-semibold text-slate-900">{displayProducts.length}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all"
                      >
                        {[10, 20, 50].map((s) => (
                          <option key={s} value={s}>
                            {s} / page
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                      >
                        Prev
                      </button>

                      <div className="px-3 py-2 text-sm font-semibold text-slate-700">
                        Page {currentPage + 1} / {totalPages}
                      </div>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
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
