import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { MoreVertical, Eye, Edit, Package, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import ProductViewModal from './ProductViewModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AuthenticatedImage from './AuthenticatedImage';
import { productsApi } from '../../services/products.api';

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
  orders?: number;
  sales?: number;
  views?: number;
  subscribers?: number;
  warehouseQuantity?: number;
  storeQuantity?: number;
}

interface FilterState {
  brand: string;
  sku: string;
  minPrice: string;
  maxPrice: string;
  isActive: string;
}

interface ProductListProps {
  products: Product[];
  onDelete: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onCreate: () => void;
  onRestock?: (id: string | number, name: string) => void;
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
}

const ProductList = ({ 
  products, 
  onDelete, 
  onEdit, 
  onCreate, 
  onRestock, 
  loading = false,
  currentPage = 0,
  totalPages = 0,
  itemsPerPage = 10,
  totalElements = 0,
  onPageChange,
  onItemsPerPageChange,
  showFilters = false,
  onToggleFilters,
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  isFiltering = false,
  allProducts
}: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: null as string | number | null, productName: '' });
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const menuRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());

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
      const res = await productsApi.search({
        q: searchValue.trim(),
        page: 0,
        size: 1000 // Get a large number to show all search results
      });
      
      if (res.data) {
        let content: Product[] = [];
        if (typeof res.data === 'object' && 'content' in res.data) {
          content = (res.data as any).content || [];
        } else if (Array.isArray(res.data)) {
          content = res.data;
        }
        
        // Fetch quantities for search results
        const { storeProductsApi } = await import('../../services/store-products.api');
        const normalized: Product[] = await Promise.all(
          content.map(async (p) => {
            let warehouseQuantity = 0;
            let storeQuantity = 0;
            if (p.id) {
              try {
                const productId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
                const stockRes = await storeProductsApi.getByProductId(productId);
                if (stockRes.data) {
                  warehouseQuantity = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
                  storeQuantity = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
                }
              } catch (err) {
                // ignore
              }
            }
            
            return {
              ...p,
              warehouseQuantity,
              storeQuantity,
            };
          })
        );
        
        setSearchResults(normalized);
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


  const handleDelete = (id: string | number, name: string) => {
    setDeleteConfirm({ isOpen: true, productId: id, productName: name });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.productId !== null) {
      onDelete(deleteConfirm.productId);
      if (isSearching) {
        setSearchResults(searchResults.filter(product => product.id !== deleteConfirm.productId));
      }
    }
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, productId: null, productName: '' });
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleViewProduct = async (product: Product) => {
    // Fetch full product details from database to ensure all info is up-to-date
    try {
      const { productsApi } = await import('../../services/products.api');
      const productRes = await productsApi.getById(product.id!);
      
      if (productRes.data) {
        const fullProduct = productRes.data;
        
        // Fetch category from product categories endpoint
        let categoryName: string | undefined = typeof fullProduct.category === 'string' 
          ? fullProduct.category 
          : undefined;
        
        if (!categoryName && fullProduct.id) {
          try {
            const catRes = await productsApi.getProductCategories(fullProduct.id);
            if (catRes.data && catRes.data.length > 0) {
              categoryName = catRes.data[0].name;
            }
          } catch (err) {
            console.error('Failed to load product category:', err);
          }
        }
        
        // Extract category from nested structure if needed
        if (!categoryName && fullProduct.category && typeof fullProduct.category === 'object') {
          const catObj = fullProduct.category as any;
          categoryName = catObj.name || catObj.title;
        }
        
        if (!categoryName && fullProduct.productCategory) {
          const pc = fullProduct.productCategory as any;
          if (pc.category) {
            categoryName = pc.category.name || pc.category.title;
          }
        }
        
        // Extract image URL from primaryImageUrl, images array, or imageUrl
        let imageUrl: string | null | undefined = fullProduct.imageUrl;
        if (!imageUrl && fullProduct.primaryImageUrl) {
          imageUrl = fullProduct.primaryImageUrl;
        }
        if (!imageUrl && fullProduct.images && Array.isArray(fullProduct.images) && fullProduct.images.length > 0) {
          const primaryImage = fullProduct.images.find((img: any) => img.isPrimary) || fullProduct.images[0];
          imageUrl = primaryImage?.url;
        }
        
        // Convert to Product format for ProductViewModal with all details from database
        const productForModal: Product & { 
          primaryImageUrl?: string | null; 
          images?: Array<{ id: number; url: string; mimeType?: string; title?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }>;
          isActive?: boolean;
          taxRate?: number;
          createdAt?: string;
          updatedAt?: string;
        } = {
          id: fullProduct.id,
          sku: fullProduct.sku,
          name: fullProduct.name,
          brand: fullProduct.brand,
          category: categoryName || (typeof fullProduct.category === 'string' ? fullProduct.category : undefined),
          cost: fullProduct.cost ?? fullProduct.defaultCost,
          price: fullProduct.price ?? fullProduct.defaultPrice ?? 0,
          wholesalePrice: fullProduct.wholesalePrice,
          unit: fullProduct.unit,
          description: fullProduct.description,
          image: imageUrl || null,
          imageUrl: imageUrl || null,
          primaryImageUrl: fullProduct.primaryImageUrl || null,
          images: fullProduct.images,
          isActive: fullProduct.isActive,
          taxRate: fullProduct.taxRate,
          createdAt: fullProduct.createdAt,
          updatedAt: fullProduct.updatedAt,
          views: (product as any).views,
          orders: (product as any).orders,
          sales: (product as any).sales,
          subscribers: (product as any).subscribers,
        };
        setSelectedProduct(productForModal);
        setIsModalOpen(true);
      } else {
        // Fallback to product from list if fetch fails
        setSelectedProduct(product);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch full product details:', err);
      // Fallback to product from list if fetch fails
      setSelectedProduct(product);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const displayProducts = isSearching ? searchResults : products;

  return (
    <div className="bg-white rounded-2xl shadow-sm border">
      {/* Title and Add Button Section */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-2xl font-bold text-slate-800">Products</h2>
        <button 
          onClick={onCreate}
          className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 hover:shadow-md hover:shadow-blue-500/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1"
          title="Add product"
          aria-label="Add product"
        >
          <span className="text-xl leading-none">+</span>
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
      {loading ? (
        <div className="px-6 py-8 text-center text-slate-600">Loading products...</div>
      ) : displayProducts.length > 0 ? (
        <div className="divide-y divide-slate-200 min-h-[400px]">
          {displayProducts.map(product => (
            <div 
              key={product.id} 
              className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 transition-all duration-200 ease-in-out border-b border-slate-100 last:border-b-0 group"
            >
              {/* Product Image/Icon */}
              <div className="flex-shrink-0">
                {(() => {
                  // Priority: images array > primaryImageUrl > imageUrl > image
                  let imageUrl: string | null = null;
                  if ((product as any).images && Array.isArray((product as any).images) && (product as any).images.length > 0) {
                    const primaryImage = (product as any).images.find((img: any) => img.isPrimary) || (product as any).images[0];
                    if (primaryImage?.url) {
                      imageUrl = productsApi.normalizeImageUrl(primaryImage.url, product.id);
                    }
                  }
                  if (!imageUrl && (product as any).primaryImageUrl) {
                    imageUrl = productsApi.normalizeImageUrl((product as any).primaryImageUrl, product.id);
                  }
                  if (!imageUrl && product.imageUrl) {
                    imageUrl = productsApi.normalizeImageUrl(product.imageUrl, product.id);
                  }
                  if (!imageUrl && product.image) {
                    imageUrl = productsApi.normalizeImageUrl(product.image, product.id);
                  }
                  return (
                    <AuthenticatedImage
                      src={imageUrl}
                      alt={product.name}
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
                <h4 className="text-base font-semibold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200">{product.name}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-200">
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Inventory: {(product.warehouseQuantity ?? (product as any).warehouseQty ?? 0)} units
                  </span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Store: {(product.storeQuantity ?? (product as any).storeQty ?? 0)} units
                  </span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">${(product.sales || 0).toFixed(2)} sales</span>
                  <span className="font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">${(product.price || 0).toFixed(2)} price</span>
                </div>
              </div>
              
              {/* Action Menu */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === product.id ? null : product.id);
                  }}
                  className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title="Actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {openMenuId === product.id && (
                  <div
                    ref={(el) => {
                      if (el) {
                        menuRefs.current.set(product.id, el);
                      } else {
                        menuRefs.current.delete(product.id);
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
                        onEdit(product.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    {onRestock && (
                      <button
                        onClick={() => {
                          onRestock(product.id, product.name);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                      >
                        <Package className="w-4 h-4" />
                        <span>Re-stock</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleDelete(product.id, product.name);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
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
          {!isSearching && !isFiltering && (!onPageChange || totalElements === 0) && (
            <button 
              onClick={onCreate} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <span>+</span>
              Add Product
            </button>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {!isSearching && onPageChange && (
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                if (onItemsPerPageChange) {
                  onItemsPerPageChange(Number(e.target.value));
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
                onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
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
      
      <ProductViewModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        productName={deleteConfirm.productName}
        message={`Remove "${deleteConfirm.productName}" from the inventory?`}
      />
    </div>
  );
};

export default ProductList;
