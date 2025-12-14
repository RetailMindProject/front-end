import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Filter } from 'lucide-react';
import ProductViewModal from './ProductViewModal';
import AddProductFromInventoryModal from './AddProductFromInventoryModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import AuthenticatedImage from './AuthenticatedImage';
import type { StoreProductResponseDTO } from '../../services/store-products.api';
import type { ProductDTO } from '../../services/products.api';
import { productsApi } from '../../services/products.api';

interface StoreManagerProps {
  storeProducts: (StoreProductResponseDTO & { imageUrl?: string | null })[];
  inventoryProducts: ProductDTO[];
  onDelete: (id: string | number) => void;
  onAddFromInventory: (product: ProductDTO, quantity: number) => Promise<void>;
  onAdjustQuantity?: (productId: number, quantity: number, isIncrease: boolean) => Promise<void>;
  loading?: boolean;
  filters?: {
    brand: string;
    sku: string;
    category: string;
    minPrice: string;
    maxPrice: string;
    isActive: string;
  };
  onFilterChange?: (name: string, value: string) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
  getAvailableInventoryProducts?: () => Promise<ProductDTO[]>;
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
  getAvailableInventoryProducts
}: StoreManagerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(StoreProductResponseDTO & { imageUrl?: string | null })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<(StoreProductResponseDTO & { imageUrl?: string | null; name: string; category?: string; cost?: number; price?: number; wholesalePrice?: number; unit?: string; description?: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: null as string | number | null, productName: '' });
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      const results = storeProducts.filter(product =>
        product.productName.toLowerCase().includes(value.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(value.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(value.toLowerCase()))
      );
      setSearchResults(results);
      setIsSearching(true);
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
        setSearchResults(searchResults.filter(product => product.productId !== deleteConfirm.productId));
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

      {/* Advanced Filters */}
      {filters && onFilterChange && onApplyFilters && onResetFilters && (
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                showFilters 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-300'
              }`}
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <Filter size={16} className={showFilters ? 'text-blue-600' : 'text-slate-600'} />
              {showFilters && (
                <span className="ml-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              )}
            </button>
          </div>
          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
                <input
                  placeholder="Brand"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.brand}
                  onChange={(e) => onFilterChange('brand', e.target.value)}
                />
                <input
                  placeholder="SKU"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.sku}
                  onChange={(e) => onFilterChange('sku', e.target.value)}
                />
                <input
                  placeholder="Category"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.category || ''}
                  onChange={(e) => onFilterChange('category', e.target.value)}
                />
                <input
                  placeholder="Min Price"
                  type="number"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.minPrice}
                  onChange={(e) => onFilterChange('minPrice', e.target.value)}
                />
                <input
                  placeholder="Max Price"
                  type="number"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.maxPrice}
                  onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                />
                <select
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.isActive}
                  onChange={(e) => onFilterChange('isActive', e.target.value)}
                >
                  <option value="">Any Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onApplyFilters}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Apply
                </button>
                <button
                  onClick={onResetFilters}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Search Section */}
      <div className="px-6 py-4 border-b bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search for product"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            {isSearching && (
              <button 
                onClick={clearSearch} 
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-slate-600">
              {isSearching ? `${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found` : `${storeProducts.length} products`}
            </span>
          </div>
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
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
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
                  <span className="font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">
                    ${((product.price || (product as any).defaultPrice || 0) > 0 ? (product.price || (product as any).defaultPrice || 0) : 0).toFixed(2)} price
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => handleViewProduct(product)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1"
                  title="View product details"
                >
                  View
                </button>
                <button 
                  onClick={() => handleDelete(product.productId, product.productName)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1"
                  title="Revert to warehouse"
                >
                  Revert
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No products in store</h3>
          <p className="text-slate-600 mb-6">Add products from inventory to get started.</p>
          <button 
            onClick={handleAddFromInventory} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <span>+</span>
            Transfer
          </button>
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
    </div>
  );
};

export default StoreManager;
