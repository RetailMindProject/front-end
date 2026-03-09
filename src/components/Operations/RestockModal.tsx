import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { storeProductsApi } from '../../services/store-products.api';
import { productsApi } from '../../services/products.api';
import type { StoreProductResponseDTO } from '../../services/store-products.api';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number | string;
  productName: string;
  onRestockSuccess?: () => void;
}

const RestockModal = ({ isOpen, onClose, productId, productName, onRestockSuccess }: RestockModalProps) => {
  const [quantity, setQuantity] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [hasExpirationDate, setHasExpirationDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProductResponseDTO | null>(null);
  const [batches, setBatches] = useState<Array<{ batchId: number; expirationDate: string; totalQuantity: number }>>([]);

  useEffect(() => {
    if (isOpen && productId && productId !== '') {
      // Automatically fetch and select the product when modal opens
      findProductById(productId);
      // Fetch batches for this product
      fetchBatches(productId);
      // Reset form
      setQuantity('');
      setExpirationDate('');
      setHasExpirationDate(false);
      setError(null);
    } else if (!isOpen) {
      // Reset form when modal closes
      setQuantity('');
      setExpirationDate('');
      setHasExpirationDate(false);
      setError(null);
      setSelectedProduct(null);
      setBatches([]);
    }
  }, [isOpen, productId]);

  // Auto-enable expiration date if product has batches
  useEffect(() => {
    if (batches.length > 0 && !hasExpirationDate) {
      setHasExpirationDate(true);
    }
  }, [batches.length]);

  const fetchBatches = async (id: number | string) => {
    if (!id || id === '') {
      return;
    }
    try {
      const res = await storeProductsApi.getBatchesForProduct(id);
      if (res.data) {
        setBatches(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      // Don't show error to user, just log it
    }
  };

  const findProductById = async (id: number | string) => {
    if (!id || id === '') {
      setError('Invalid product ID');
      setLoadingProducts(false);
      return;
    }
    try {
      setLoadingProducts(true);
      setError(null);
      
      // First try to get from store products (if it exists in inventory)
      const storeRes = await storeProductsApi.getByProductId(id);
      if (storeRes.data) {
        // Product exists in store inventory, use that data
        setSelectedProduct(storeRes.data);
        return;
      }
      
      // If not found in store products, try to get basic product info from products API
      // This handles the case where product was just created but not yet added to inventory
      // ✅ OPTIMIZED: Request stock data (though it will be 0 for new products)
      const productRes = await productsApi.getById(id, {
        includeStock: true
      });
      if (productRes.data) {
        // Create a mock StoreProductResponseDTO from ProductDTO
        const product = productRes.data;
        const mockStoreProduct: StoreProductResponseDTO = {
          productId: typeof product.id === 'string' ? parseInt(product.id) : product.id,
          sku: product.sku || '',
          productName: product.name || productName,
          warehouseQty: 0, // Will be set when restocked
          storeQty: 0,
          warehouseQuantity: 0,
          storeQuantity: 0,
        };
        setSelectedProduct(mockStoreProduct);
        // Clear error since we found the product, just not in inventory yet
        setError(null);
      } else {
        setError('Product not found');
      }
    } catch (err) {
      console.error('Failed to find product:', err);
      // Try fallback to products API
      try {
        // ✅ OPTIMIZED: Request stock data
        const productRes = await productsApi.getById(id, {
          includeStock: true
        });
        if (productRes.data) {
          const product = productRes.data;
          const mockStoreProduct: StoreProductResponseDTO = {
            productId: typeof product.id === 'string' ? parseInt(product.id) : product.id,
            sku: product.sku || '',
            productName: product.name || productName,
            warehouseQty: 0,
            storeQty: 0,
            warehouseQuantity: 0,
            storeQuantity: 0,
          };
          setSelectedProduct(mockStoreProduct);
          setError(null);
        } else {
          setError('Product not found. Unable to load product information.');
        }
      } catch (fallbackErr) {
        setError('Product not found. Unable to load product information.');
      }
    } finally {
      setLoadingProducts(false);
    }
  };


  const checkExistingBatch = (expDate: string): { batchId: number; expirationDate: string; totalQuantity: number } | null => {
    // Normalize dates for comparison (compare only date part, ignore time)
    const normalizeDate = (dateStr: string) => {
      return dateStr.split('T')[0]; // Get YYYY-MM-DD part only
    };
    
    const normalizedInputDate = normalizeDate(expDate);
    
    return batches.find(batch => {
      const normalizedBatchDate = normalizeDate(batch.expirationDate);
      return normalizedBatchDate === normalizedInputDate;
    }) || null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    const qty = parseInt(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    // If product has batches (expiration dates), expiration date is mandatory
    const hasBatches = batches.length > 0;
    if (hasBatches && !hasExpirationDate) {
      setError('This product has expiration dates. Please set an expiration date for this batch.');
      return;
    }

    if (hasExpirationDate && !expirationDate.trim()) {
      setError('Expiration date is required when expiration date tracking is enabled');
      return;
    }

    // Check if expiration date matches an existing batch
    if (hasExpirationDate && expirationDate.trim()) {
      const existingBatch = checkExistingBatch(expirationDate);
      if (existingBatch) {
        // Show confirmation alert
        const confirmMessage = `This batch already exists with expiration date.\n\nDo you want to add more quantity to this batch?`;
        const userConfirmed = window.confirm(confirmMessage);
        
        if (!userConfirmed) {
          // User cancelled, don't proceed
          return;
        }
        // User confirmed, proceed with restock (backend will handle merging)
      }
    }

    setLoading(true);
    try {
      const dto = {
        productId: selectedProduct.productId,
        quantity: qty,
        notes: `Re-stocked product: ${selectedProduct.productName || productName}`,
        expirationDate: hasExpirationDate && expirationDate.trim() ? expirationDate : null
      };

      const res = await storeProductsApi.restock(dto);
      if (res.data) {
        // Success
        if (onRestockSuccess) {
          onRestockSuccess();
        }
        onClose();
      } else {
        throw new Error(res.error || 'Failed to re-stock product');
      }
    } catch (err) {
      console.error('Restock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to re-stock product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-slate-800">Re-stock Product</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <form id="restock-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Product Information (Read-only) */}
            {loadingProducts ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-slate-500 mt-2 text-sm">Loading product...</p>
              </div>
            ) : selectedProduct ? (
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <div className="space-y-3">
                  {/* SKU and Name Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-0.5 block">SKU</label>
                      <p className="text-sm text-slate-700">{selectedProduct.sku || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-0.5 block">Name</label>
                      <p className="text-sm text-slate-700">{selectedProduct.productName || productName || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Quantities Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-0.5 block">Warehouse Quantity</label>
                      <p className="text-base text-slate-700">{selectedProduct.warehouseQty || selectedProduct.warehouseQuantity || 0}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-0.5 block">Store Quantity</label>
                      <p className="text-base text-slate-700">{selectedProduct.storeQty || selectedProduct.storeQuantity || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-red-500 text-base font-semibold mb-1">Product not found</div>
                <p className="text-xs text-slate-500">Unable to load product information. Please try again.</p>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1.5">
                Quantity to Re-stock <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-base"
                placeholder="Enter quantity"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Enter the quantity you want to add to inventory</p>
            </div>

            {/* Expiration Date */}
            <div className="rounded-md p-3 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="hasExpirationDate"
                  checked={hasExpirationDate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasExpirationDate(checked);
                    if (!checked) {
                      setExpirationDate('');
                    }
                  }}
                  disabled={batches.length > 0}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="hasExpirationDate" className={`text-sm font-medium text-slate-700 cursor-pointer ${batches.length > 0 ? 'cursor-default' : ''}`}>
                  Set expiration date for this batch {batches.length > 0 && <span className="text-red-500">*</span>}
                </label>
              </div>
              {batches.length > 0 && (
                <p className="text-xs text-slate-500 mb-3">This product has expiration dates. Expiration date is required.</p>
              )}
              
              {(hasExpirationDate || batches.length > 0) && (
                <div className="pl-6">
                  <label htmlFor="expirationDate" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Expiration Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="expirationDate"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    min={(() => {
                      // Set minimum date to tomorrow (today + 1 day)
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return tomorrow.toISOString().split('T')[0];
                    })()}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required={hasExpirationDate || batches.length > 0}
                  />
                  {expirationDate && (() => {
                    const existingBatch = checkExistingBatch(expirationDate);
                    if (existingBatch) {
                      return (
                        <p className="mt-1 text-xs text-amber-600 font-medium">
                          ⚠️ Batch already exists. Adding more will merge with existing batch.
                        </p>
                      );
                    }
                    return (
                      <p className="mt-1 text-xs text-slate-500">This will create a new batch with the specified expiration date</p>
                    );
                  })()}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-sm">⚠️</span>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="restock-form"
            disabled={loading || !selectedProduct}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                Re-stocking...
              </span>
            ) : (
              'Re-stock'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestockModal;

