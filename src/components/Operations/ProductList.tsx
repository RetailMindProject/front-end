import { useState } from 'react';
import type { ChangeEvent } from 'react';
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

interface ProductListProps {
  products: Product[];
  onDelete: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onCreate: () => void;
  loading?: boolean;
}

const ProductList = ({ products, onDelete, onEdit, onCreate, loading = false }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: null as string | number | null, productName: '' });

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      const results = products.filter(product =>
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(value.toLowerCase())) ||
        (product.category && product.category.toLowerCase().includes(value.toLowerCase())) ||
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
              {isSearching ? `${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found` : `${products.length} products`}
            </span>
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="px-6 py-8 text-center text-slate-600">Loading products...</div>
      ) : displayProducts.length > 0 ? (
        <div className="divide-y divide-slate-200">
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
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => onEdit(product.id)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1"
                  title="Edit product"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleViewProduct(product)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:ring-offset-1"
                  title="View product details"
                >
                  View
                </button>
                <button 
                  onClick={() => handleDelete(product.id, product.name)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-1 focus:ring-red-500 focus:ring-offset-1"
                  title="Remove product"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No products found</h3>
          <p className="text-slate-600 mb-6">Try adjusting your search terms or add a new product.</p>
          <button 
            onClick={onCreate} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <span>+</span>
            Add Product
          </button>
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
