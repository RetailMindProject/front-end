import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { Filter, MoreVertical, Eye, RotateCcw } from 'lucide-react';
import ProductViewModal from './ProductViewModal';
import AddProductFromInventoryModal from './AddProductFromInventoryModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AuthenticatedImage from './AuthenticatedImage';
import type { StoreProductResponseDTO } from '../../services/store-products.api';
import type { ProductDTO } from '../../services/products.api';
import { productsApi } from '../../services/products.api';

interface FilterState {
  brand: string;
  sku: string;
  minPrice: string;
  maxPrice: string;
  isActive: string;
}

interface StoreManagerProps {
  storeProducts: (StoreProductResponseDTO & { imageUrl?: string | null })[];
  inventoryProducts: ProductDTO[];
  onDelete: (id: string | number) => void;
  onAddFromInventory: (product: ProductDTO, quantity: number) => Promise<void>;
  onAdjustQuantity?: (productId: number, quantity: number, isIncrease: boolean) => Promise<void>;
  loading?: boolean;
  filters?: FilterState;
  onFilterChange?: (name: string, value: string) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
  getAvailableInventoryProducts?: () => Promise<ProductDTO[]>;
  sortBy?: 'sales' | 'none';
  onSortChange?: (sortBy: 'sales' | 'none') => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onFiltersChange?: (filters: FilterState) => void;
  isFiltering?: boolean;
  allStoreProducts?: (StoreProductResponseDTO & { imageUrl?: string | null })[]; // All products for comprehensive search
}

const StoreManager = ({ 
  storeProducts, 
  inventoryProducts, 
  onDelete,
  onAddFromInventory,
  onAdjustQuantity,
  loading = false,
  filters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  getAvailableInventoryProducts,
  sortBy = 'none',
  onSortChange,
  showFilters = false,
  onToggleFilters,
  onFiltersChange,
  isFiltering = false,
  allStoreProducts
}: StoreManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(StoreProductResponseDTO & { imageUrl?: string | null })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [selectedProduct, setSelectedProduct] = useState<(StoreProductResponseDTO & { imageUrl?: string | null; name: string; category?: string; cost?: number; price?: number; wholesalePrice?: number; unit?: string; description?: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: null as string | number | null, productName: '' });
  const [revertModal, setRevertModal] = useState({ 
    isOpen: false, 
    productId: null as number | null, 
    productName: '', 
    storeQuantity: 0 
  });
  const [revertQuantity, setRevertQuantity] = useState<string>('');
  const [revertMode, setRevertMode] = useState<'all' | 'quantity'>('all');

  // Debounced search function
  const performSearch = async (searchValue: string) => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // Use API search to fetch only matching products
      const { storeProductsApi } = await import('../../services/store-products.api');
      const res = await storeProductsApi.search({
        q: searchValue.trim(),
        page: 0,
        size: 1000 // Get a large number to show all search results
      });
      
      if (res.data) {
        const content = res.data.content || [];
        
        // Fetch full product details for each result
        const normalizedResults = await Promise.all(
          content.map(async (p) => {
            try {
              const productRes = await productsApi.getById(p.productId);
              if (productRes.data) {
                const fullProduct = productRes.data;
                
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
                
                return {
                  ...p,
                  imageUrl: imageUrl || p.imageUrl || null,
                };
              }
            } catch (err) {
              console.error(`Failed to get full product details for ${p.productId}:`, err);
            }
            
            return p;
          })
        );
        
        setSearchResults(normalizedResults);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      performSearch(value);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current.get(openMenuId);
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleDelete = (id: string | number, name: string) => {
    // Find the product to get store quantity
    const product = storeProducts.find(p => p.productId === id);
    const storeQty = product?.storeQty || product?.storeQuantity || 0;
    setRevertModal({ 
      isOpen: true, 
      productId: typeof id === 'string' ? parseInt(id) : id, 
      productName: name,
      storeQuantity: storeQty
    });
    setRevertQuantity('');
    setRevertMode('all');
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.productId !== null) {
      onDelete(deleteConfirm.productId);
      if (isSearching) {
        setSearchResults(searchResults.filter(product => product.productId !== deleteConfirm.productId));
      }
    }
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
  };

  const handleConfirmRevert = async () => {
    if (revertModal.productId === null) return;
    
    let quantityToRevert: number;
    if (revertMode === 'all') {
      quantityToRevert = revertModal.storeQuantity;
    } else {
      const enteredQty = parseInt(revertQuantity) || 0;
      if (enteredQty <= 0) {
        alert('Please enter a valid quantity greater than 0');
        return;
      }
      if (enteredQty > revertModal.storeQuantity) {
        alert(`Cannot revert more than ${revertModal.storeQuantity} units (available in store)`);
        return;
      }
      quantityToRevert = enteredQty;
    }
    
    if (quantityToRevert <= 0) {
      alert('No quantity to revert');
      return;
    }
    
    try {
      if (onAdjustQuantity) {
        await onAdjustQuantity(revertModal.productId, quantityToRevert, false);
      }
      setRevertModal({ isOpen: false, productId: null, productName: '', storeQuantity: 0 });
      setRevertQuantity('');
      setRevertMode('all');
      // Refresh search results if searching
      if (isSearching) {
        const updatedResults = searchResults.map(p => {
          if (p.productId === revertModal.productId) {
            return {
              ...p,
              storeQty: (p.storeQty || 0) - quantityToRevert,
              storeQuantity: (p.storeQuantity || 0) - quantityToRevert
            };
          }
          return p;
        });
        setSearchResults(updatedResults);
      }
    } catch (err) {
      console.error('Revert failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to revert product');
    }
  };

  const handleCancelRevert = () => {
    setRevertModal({ isOpen: false, productId: null, productName: '', storeQuantity: 0 });
    setRevertQuantity('');
    setRevertMode('all');
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleViewProduct = async (product: StoreProductResponseDTO & { imageUrl?: string | null }) => {
    // Fetch full product details to show all information
    try {
      const { productsApi } = await import('../../services/products.api');
      const productRes = await productsApi.getById(product.productId);
      
      if (productRes.data) {
        const fullProduct = productRes.data;
        
        // Fetch category from product categories endpoint
        let categoryName: string | undefined = product.category;
        try {
          const catRes = await productsApi.getProductCategories(product.productId);
          if (catRes.data && catRes.data.length > 0) {
            categoryName = catRes.data[0].name;
          }
        } catch (err) {
          console.error('Failed to load product category:', err);
        }
        
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
        
        // Convert to Product format for ProductViewModal with all details from database
        const productForModal = {
          id: fullProduct.id || product.productId,
          sku: fullProduct.sku || product.sku || undefined,
          name: fullProduct.name || product.productName,
          brand: fullProduct.brand || product.brand || undefined,
          category: categoryName || (typeof fullProduct.category === 'string' ? fullProduct.category : undefined) || product.category || undefined,
          cost: fullProduct.cost ?? fullProduct.defaultCost ?? product.cost ?? undefined,
          price: fullProduct.price ?? fullProduct.defaultPrice ?? product.price ?? 0,
          defaultCost: fullProduct.defaultCost,
          defaultPrice: fullProduct.defaultPrice,
          wholesalePrice: fullProduct.wholesalePrice ?? undefined,
          unit: fullProduct.unit || undefined,
          description: fullProduct.description || undefined,
          image: imageUrl || product.imageUrl || product.primaryImageUrl || null,
          imageUrl: imageUrl || product.imageUrl || product.primaryImageUrl || null,
          primaryImageUrl: fullProduct.primaryImageUrl || product.primaryImageUrl || null,
          images: fullProduct.images || undefined,
          isActive: fullProduct.isActive,
          taxRate: fullProduct.taxRate,
          createdAt: fullProduct.createdAt,
          updatedAt: fullProduct.updatedAt,
          views: undefined,
          orders: undefined,
          sales: undefined,
          subscribers: undefined,
        };
        setSelectedProduct(productForModal as any);
        setIsModalOpen(true);
      } else {
        // Fallback to store product data if fetch fails
        const productForModal = {
          id: product.productId,
          sku: product.sku,
          name: product.productName,
          brand: product.brand,
          category: product.category,
          cost: product.cost,
          price: product.price || 0,
          wholesalePrice: undefined,
          unit: undefined,
          description: undefined,
          image: product.imageUrl || product.primaryImageUrl || null,
          imageUrl: product.imageUrl || product.primaryImageUrl || null,
          views: undefined,
          orders: undefined,
          sales: undefined,
          subscribers: undefined,
        };
        setSelectedProduct(productForModal as any);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch full product details:', err);
      // Fallback to store product data if fetch fails
      const productForModal = {
        id: product.productId,
        sku: product.sku,
        name: product.productName,
        brand: product.brand,
        category: product.category,
        cost: product.cost,
        price: product.price || 0,
        wholesalePrice: undefined,
        unit: undefined,
        description: undefined,
        image: product.imageUrl || product.primaryImageUrl || null,
        imageUrl: product.imageUrl || product.primaryImageUrl || null,
        views: undefined,
        orders: undefined,
        sales: undefined,
        subscribers: undefined,
      };
      setSelectedProduct(productForModal as any);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleAddFromInventory = () => {
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleProductSelected = async (product: ProductDTO, quantity: number) => {
    await onAddFromInventory(product, quantity);
    closeAddModal();
  };

  const displayProducts = isSearching ? searchResults : storeProducts;

  return (
    <div className="bg-white rounded-2xl shadow-sm border">
      {/* Title and Add Button Section */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-2xl font-bold text-slate-800">Products</h2>
        <button 
          onClick={handleAddFromInventory}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 hover:shadow-md hover:shadow-blue-500/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-base transition-transform duration-200 hover:rotate-90">+</span>
          Transfer
        </button>
      </div>

      {/* Search Section */}
      <div className="px-6 py-4 border-b bg-slate-50/50 overflow-x-hidden">
        <div className="flex items-center gap-2 flex-nowrap min-h-[40px] w-full min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search product"
              className={`border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder:text-slate-400 hover:border-slate-400 transition-all duration-200 ease-out ${
                showFilters 
                  ? 'px-2 py-1.5 text-xs w-28' 
                  : 'px-3 py-2 text-sm flex-1 max-w-md'
              }`}
            />
            {isSearching && (
              <button 
                onClick={clearSearch} 
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
          
          {filters && onFiltersChange && (
            <div 
              className="flex items-center gap-2 flex-nowrap min-w-0 flex-1"
              style={{ 
                visibility: showFilters ? 'visible' : 'hidden',
                opacity: showFilters ? 1 : 0,
                pointerEvents: showFilters ? 'auto' : 'none',
                transition: 'opacity 0.2s ease-out, visibility 0.2s ease-out',
                maxWidth: showFilters ? 'none' : '0',
                overflow: 'hidden'
              }}
            >
              <input
                placeholder="Brand"
                className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-24 flex-shrink-0 placeholder:text-slate-400 hover:border-slate-400"
                value={filters.brand}
                onChange={(e) => onFiltersChange({ ...filters, brand: e.target.value })}
              />
              <input
                placeholder="SKU"
                className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-24 flex-shrink-0 placeholder:text-slate-400 hover:border-slate-400"
                value={filters.sku}
                onChange={(e) => onFiltersChange({ ...filters, sku: e.target.value })}
              />
              <input
                placeholder="Min $"
                type="number"
                min="0"
                step="0.01"
                className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-20 flex-shrink-0 placeholder:text-slate-400 hover:border-slate-400"
                value={filters.minPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || parseFloat(value) >= 0) {
                    onFiltersChange({ ...filters, minPrice: value });
                  }
                }}
              />
              <input
                placeholder="Max $"
                type="number"
                min="0"
                step="0.01"
                className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-20 flex-shrink-0 placeholder:text-slate-400 hover:border-slate-400"
                value={filters.maxPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || parseFloat(value) >= 0) {
                    onFiltersChange({ ...filters, maxPrice: value });
                  }
                }}
              />
              <select
                className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-24 flex-shrink-0 text-slate-700 hover:border-slate-400"
                value={filters.isActive}
                onChange={(e) => onFiltersChange({ ...filters, isActive: e.target.value })}
              >
                <option value="">Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              {onSortChange && (
                <select
                  className="px-2 py-1.5 text-xs border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white w-24 flex-shrink-0 text-slate-700 hover:border-slate-400"
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value as 'sales' | 'none')}
                >
                  <option value="none">Sort By</option>
                  <option value="sales">Most Sold</option>
                </select>
              )}
              {onApplyFilters && (
                <button
                  onClick={onApplyFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0 whitespace-nowrap"
                >
                  Apply
                </button>
              )}
              {onResetFilters && (
                <button
                  onClick={onResetFilters}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-all duration-200 flex-shrink-0 whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          )}
          
          {onToggleFilters && (
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <button
                onClick={onToggleFilters}
                className={`p-2 rounded-lg transition-all duration-200 cursor-pointer border-2 ${
                  showFilters 
                    ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 shadow-md' 
                    : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-sm'
                }`}
                title={showFilters ? 'Hide filters' : 'Show filters'}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products List */}
      {loading && displayProducts.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-slate-600">Loading products...</p>
        </div>
      ) : displayProducts.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {displayProducts.map(product => (
            <div 
              key={product.productId} 
              className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 transition-all duration-200 ease-in-out border-b border-slate-100 last:border-b-0 group"
            >
              {/* Product Image/Icon */}
              <div className="flex-shrink-0">
                {(() => {
                  // Priority: images array > primaryImageUrl > imageUrl
                  let imageUrl: string | null = null;
                  if ((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) {
                    const primaryImage = (product as any).images.find((img: any) => img.isPrimary) || (product as any).images[0];
                    if (primaryImage?.url) {
                      imageUrl = productsApi.normalizeImageUrl(primaryImage.url, product.productId);
                    }
                  }
                  if (!imageUrl && product.primaryImageUrl) {
                    imageUrl = productsApi.normalizeImageUrl(product.primaryImageUrl, product.productId);
                  }
                  if (!imageUrl && product.imageUrl) {
                    imageUrl = productsApi.normalizeImageUrl(product.imageUrl, product.productId);
                  }
                  return (
                    <AuthenticatedImage
                      src={imageUrl}
                      alt={product.productName}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                      fallbackIcon={
                        <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>
                      }
                    />
                  );
                })()}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200">{product.productName}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-200">
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Store: {(product as any).storeQty || product.storeQuantity || 0} units
                  </span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Warehouse: {(product as any).warehouseQty || product.warehouseQuantity || 0} units
                  </span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    {(product as any).orders || 0} orders
                  </span>
                  <span className="font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                    ${((product.price || (product as any).defaultPrice || 0) > 0 ? (product.price || (product as any).defaultPrice || 0) : 0).toFixed(2)} price
                  </span>
                </div>
              </div>
              
              {/* Action Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === product.productId ? null : product.productId);
                  }}
                  className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {openMenuId === product.productId && (
                  <div
                    ref={(el) => {
                      if (el) {
                        menuRefs.current.set(product.productId, el);
                      } else {
                        menuRefs.current.delete(product.productId);
                      }
                    }}
                    className="absolute right-0 top-8 z-50 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        handleViewProduct(product);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(product.productId, product.productName);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Revert</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No products found</h3>
          {!isSearching && !isFiltering && (
            <button 
              onClick={handleAddFromInventory} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <span>+</span>
              Transfer
            </button>
          )}
        </div>
      )}
      
      <ProductViewModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      <AddProductFromInventoryModal
        inventoryProducts={inventoryProducts}
        storeProducts={storeProducts.map(p => ({ 
          id: p.productId, 
          name: p.productName, 
          price: p.price ?? 0,
          ...p 
        }))}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSelect={handleProductSelected}
        onAdjustQuantity={onAdjustQuantity}
        getAvailableInventoryProducts={getAvailableInventoryProducts}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        productName={deleteConfirm.productName}
        message={`Revert "${deleteConfirm.productName}" to the warehouse? This will return the product to the warehouse.`}
      />

      {/* Revert Modal with Quantity Options */}
      {revertModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCancelRevert}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-semibold text-slate-800">
                Revert to Warehouse
              </h2>
              <button 
                className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
                onClick={handleCancelRevert}
              >
                ×
              </button>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-base text-slate-700 mb-4">
                Revert <span className="font-semibold">"{revertModal.productName}"</span> to the warehouse?
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Current store quantity: <span className="font-semibold text-blue-600">{revertModal.storeQuantity}</span>
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revertMode"
                      value="all"
                      checked={revertMode === 'all'}
                      onChange={() => {
                        setRevertMode('all');
                        setRevertQuantity('');
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Revert All ({revertModal.storeQuantity} units)</span>
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="revertMode"
                      value="quantity"
                      checked={revertMode === 'quantity'}
                      onChange={() => setRevertMode('quantity')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Choose Quantity</span>
                  </label>
                </div>
                
                {revertMode === 'quantity' && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity to Revert <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={revertModal.storeQuantity}
                      value={revertQuantity}
                      onChange={(e) => setRevertQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter quantity (max: ${revertModal.storeQuantity})`}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Maximum: {revertModal.storeQuantity} units
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50/50">
              <button 
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors min-w-[80px]"
                onClick={handleCancelRevert}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors min-w-[80px]"
                onClick={handleConfirmRevert}
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManager;
