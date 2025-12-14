import { useState, useEffect } from 'react';
import { productsApi } from '../../services/products.api';
import { storeProductsApi } from '../../services/store-products.api';
import AuthenticatedImage from './AuthenticatedImage';

interface Product {
  id?: string | number;
  sku?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  cost?: number;
  price?: number;
  defaultCost?: number;
  defaultPrice?: number;
  wholesalePrice?: number;
  unit?: string;
  image?: string | null;
  imageUrl?: string | null;
  primaryImageUrl?: string | null;
  images?: Array<{ id: number; url: string; mimeType?: string; title?: string; altText?: string; sortOrder?: number; isPrimary?: boolean }>;
  views?: number;
  orders?: number;
  sales?: number;
  subscribers?: number;
  isActive?: boolean;
  taxRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatValue = (value: string | number | null | undefined, fallback: string = '—'): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return String(value);
};

const parseNumericValue = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const formatCurrency = (value: number | string | null | undefined): string => {
  const numericValue = parseNumericValue(value);
  if (numericValue === null) return '—';
  return `$${numericValue.toFixed(2)}`;
};

const formatNumber = (value: number | string | null | undefined): number | null => {
  const numericValue = parseNumericValue(value);
  if (numericValue === null) return null;
  return numericValue;
};

const ProductViewModal = ({ product, isOpen, onClose }: ProductViewModalProps) => {
  const [categoryName, setCategoryName] = useState<string | undefined>(product?.category);
  const [parentCategoryName, setParentCategoryName] = useState<string | undefined>(undefined);
  const [warehouseQuantity, setWarehouseQuantity] = useState<number | null>(null);
  const [storeQuantity, setStoreQuantity] = useState<number | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null);

  useEffect(() => {
    // Fetch category and quantity from API when modal opens
    if (isOpen && product?.id) {
      const fetchData = async () => {
        // Fetch categories (subcategory and parent)
        try {
          const catRes = await productsApi.getProductCategories(product.id!);
          if (catRes.data && catRes.data.length > 0) {
            const subCategory = catRes.data[0]; // First category is the subcategory
            setCategoryName(subCategory.name);
            
            // If subcategory has a parent, fetch all categories to find the parent
            if (subCategory.parentId) {
              try {
                const allCategoriesRes = await productsApi.getCategories();
                if (allCategoriesRes.data) {
                  const parentCategory = allCategoriesRes.data.find(cat => cat.id === subCategory.parentId);
                  if (parentCategory) {
                    setParentCategoryName(parentCategory.name);
                  }
                }
              } catch (err) {
                console.error('Failed to fetch parent category:', err);
              }
            }
          } else {
            setCategoryName(product.category);
          }
        } catch (err) {
          console.error('Failed to fetch product category:', err);
          setCategoryName(product.category);
        }

        // Fetch quantity from stock_snapshot
        try {
          const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
          if (productId) {
            const stockRes = await storeProductsApi.getByProductId(productId);
            if (stockRes.data) {
              const qty = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
              const storeQty = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
              setWarehouseQuantity(qty);
              setStoreQuantity(storeQty);
            } else {
              setWarehouseQuantity(0);
              setStoreQuantity(0);
            }
          }
        } catch (err) {
          console.error('Failed to fetch product quantity:', err);
          setWarehouseQuantity(0);
          setStoreQuantity(0);
        }
      };
      fetchData();
    } else {
      setCategoryName(product?.category);
      setParentCategoryName(undefined);
      setWarehouseQuantity(null);
      setStoreQuantity(null);
    }
  }, [isOpen, product?.id, product?.category]);

  if (!isOpen || !product) return null;

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
          <h2 className="text-2xl font-bold text-slate-800">{product.name}</h2>
          <button 
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product Images */}
            <div className="md:col-span-1">
              {(() => {
                // Get all images from the product
                const productImages = product.images && Array.isArray(product.images) ? product.images : [];
                const primaryImageUrl = product.primaryImageUrl;
                const imageUrl = product.imageUrl;
                
                // If we have multiple images, show them in a grid
                if (productImages.length > 0) {
                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-slate-600">Product Images ({productImages.length}):</p>
                      <div className="grid grid-cols-2 gap-3">
                        {productImages.map((img: any, index: number) => {
                          let imgUrl = img.url || img.imageUrl;
                          if (imgUrl && !imgUrl.startsWith('http') && product.id) {
                            imgUrl = productsApi.normalizeImageUrl(imgUrl, product.id);
                          }
                          return (
                            <div 
                              key={img.id || index} 
                              className="relative cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setExpandedImage({ url: imgUrl || '', alt: `${product.name} - Image ${index + 1}` })}
                            >
                              <AuthenticatedImage
                                src={imgUrl}
                                alt={`${product.name} - Image ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border-2 border-slate-200"
                                fallbackIcon={
                                  <div className="w-full h-32 bg-slate-100 border-2 border-slate-200 rounded-lg flex items-center justify-center">
                                    <span className="text-xl">📦</span>
                                  </div>
                                }
                              />
                              {img.isPrimary && (
                                <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Primary</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Fallback to single image display
                let singleImageUrl: string | null = null;
                if (primaryImageUrl) {
                  singleImageUrl = productsApi.normalizeImageUrl(primaryImageUrl, product.id);
                } else if (imageUrl) {
                  singleImageUrl = productsApi.normalizeImageUrl(imageUrl, product.id);
                } else if (product.image) {
                  singleImageUrl = productsApi.normalizeImageUrl(product.image, product.id);
                }
                
                return (
                  <div 
                    className="cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => singleImageUrl && setExpandedImage({ url: singleImageUrl, alt: product.name })}
                  >
                    <AuthenticatedImage
                      src={singleImageUrl}
                      alt={product.name}
                      className="w-full h-64 object-cover rounded-xl border-2 border-slate-200"
                      fallbackIcon={
                        <div className="w-full h-64 bg-slate-100 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-6xl mb-2">📦</span>
                          <p className="text-slate-500 text-sm">No image available</p>
                        </div>
                      }
                    />
                  </div>
                );
              })()}
            </div>
            
            {/* Product Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Product Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.name)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Subcategory</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(categoryName, '—')}</p>
                  </div>
                  {parentCategoryName && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Parent Category</label>
                      <p className="text-sm text-slate-800 mt-1">{formatValue(parentCategoryName, '—')}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.id)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SKU</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.sku)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.brand)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Unit</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.unit)}</p>
                  </div>
                  {warehouseQuantity !== null && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Warehouse Quantity</label>
                      <p className="text-sm text-slate-800 mt-1 font-semibold">{warehouseQuantity}</p>
                    </div>
                  )}
                  {storeQuantity !== null && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Store Quantity</label>
                      <p className="text-sm text-slate-800 mt-1 font-semibold">{storeQuantity}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cost</label>
                    <p className="text-sm text-slate-800 mt-1">{formatCurrency(product.cost ?? product.defaultCost)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Price</label>
                    <p className="text-lg font-semibold text-blue-600 mt-1">{formatCurrency(product.price ?? product.defaultPrice)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Wholesale Price</label>
                    <p className="text-sm text-slate-800 mt-1">{formatCurrency(product.wholesalePrice)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {formatValue(product.description, 'No description provided')}
                </p>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(product.isActive !== undefined) && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</label>
                      <p className="text-sm text-slate-800 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  )}
                  {(product.taxRate !== undefined && product.taxRate !== null) && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tax Rate</label>
                      <p className="text-sm text-slate-800 mt-1">{product.taxRate}%</p>
                    </div>
                  )}
                  {product.createdAt && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created At</label>
                      <p className="text-sm text-slate-800 mt-1">
                        {new Date(product.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {product.updatedAt && (
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Updated At</label>
                      <p className="text-sm text-slate-800 mt-1">
                        {new Date(product.updatedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              {(product.views !== undefined || product.orders !== undefined || product.sales !== undefined || product.subscribers !== undefined) && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['views', 'orders', 'sales', 'subscribers'] as const).map((key) => {
                      const labels: Record<string, string> = {
                        views: 'Views',
                        orders: 'Orders',
                        sales: 'Sales',
                        subscribers: 'Subscribers'
                      };

                      const value = key === 'sales'
                        ? formatCurrency(product[key])
                        : formatNumber(product[key]);

                      if (value === null || value === '—') return null;

                      return (
                        <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                          <div className="text-lg font-semibold text-slate-800">
                            {key === 'sales' ? value : String(value)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{labels[key]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
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

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl font-bold transition-colors backdrop-blur-sm"
              onClick={() => setExpandedImage(null)}
              aria-label="Close"
            >
              ×
            </button>
            <AuthenticatedImage
              src={expandedImage.url}
              alt={expandedImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg"
              fallbackIcon={
                <div className="w-full h-96 bg-slate-800 border-2 border-slate-600 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-6xl mb-2">📦</span>
                  <p className="text-slate-400 text-sm">Image not available</p>
                </div>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductViewModal;
