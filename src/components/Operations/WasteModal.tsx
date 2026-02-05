import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { storeProductsApi, type WasteRequestDTO, type ProductBatchDTO } from '../../services/store-products.api';
import { productsApi } from '../../services/products.api';
import type { ProductDTO } from '../../services/products.api';

interface WasteModalProps {
  isOpen: boolean;
  productId: number | null;
  batchId?: number | null;
  onSuccess: () => void;
  onClose: () => void;  
}

export default function WasteModal({ isOpen, productId, batchId, onSuccess, onClose }: WasteModalProps) {
  const [product, setProduct] = useState<(ProductDTO & { warehouseQuantity?: number }) | null>(null);
  const [batches, setBatches] = useState<ProductBatchDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    wasteReason: 'EXPIRED' as 'EXPIRED' | 'BROKEN' | 'DAMAGED' | 'OTHER',
    notes: '',
    selectedBatchId: batchId || null as number | null
  });

  useEffect(() => {
    if (isOpen && productId) {
      loadProductData();
    } else {
      resetForm();
    }
  }, [isOpen, productId, batchId]);

  const loadProductData = async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch product details from products API
      const productRes = await productsApi.getById(productId);
      
      // Fetch store product details to get warehouse quantity
      const storeProductRes = await storeProductsApi.getByProductId(productId);
      
      if (productRes.data) {
        // Combine product data with warehouse quantity from store product
        const productWithQuantity = {
          ...productRes.data,
          warehouseQuantity: storeProductRes.data 
            ? (storeProductRes.data.warehouseQty || storeProductRes.data.warehouseQuantity || 0)
            : 0
        };
        setProduct(productWithQuantity);
      }

      // Fetch batches for this product
      const batchesRes = await storeProductsApi.getBatchesForProduct(productId);
      if (batchesRes.data) {
        // Filter to show only batches with quantity > 0 (strict check)
        // Convert to number to handle string/number inconsistencies
        const availableBatches = batchesRes.data.filter(batch => {
          const qty = typeof batch.totalQuantity === 'string' 
            ? parseFloat(batch.totalQuantity) 
            : Number(batch.totalQuantity);
          return !isNaN(qty) && qty > 0;
        });
        console.log('Batches for product:', {
          productId,
          allBatches: batchesRes.data,
          filteredBatches: availableBatches
        });
        setBatches(availableBatches);
        
        // If batchId provided, set it as selected
        if (batchId && availableBatches.some(b => b.batchId === batchId)) {
          setFormData(prev => ({ ...prev, selectedBatchId: batchId }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      quantity: '',
      wasteReason: 'EXPIRED',
      notes: '',
      selectedBatchId: batchId || null
    });
    setError(null);
    setProduct(null);
    setBatches([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) return;
    
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (batches.length > 0 && !formData.selectedBatchId) {
      setError('Please select a batch');
      return;
    }

    if (formData.wasteReason === 'OTHER' && !formData.notes.trim()) {
      setError('Please provide notes for "Other" reason');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build notes field - always include waste reason
      let notesText = `Waste Reason: ${formData.wasteReason}`;
      if (formData.wasteReason === 'OTHER' && formData.notes.trim()) {
        notesText += `. ${formData.notes.trim()}`;
      }

      const dto: WasteRequestDTO = {
        productId,
        quantity,
        batchId: formData.selectedBatchId || null,
        note: notesText // Waste reason formatted as "Waste Reason: REASON" or "Waste Reason: REASON. additional notes"
      };

      console.log('Sending waste request:', dto); // Debug log

      const res = await storeProductsApi.recordWaste(dto);
      
      if (res.data) {
        onSuccess();
        onClose();
      } else {
        // Handle error
        const errorMessage = res.error || 'Failed to record waste';
        setError(errorMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record waste');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedBatch = batches.find(b => b.batchId === formData.selectedBatchId);
  const maxQuantity = selectedBatch ? selectedBatch.totalQuantity : (product ? (product.warehouseQuantity || 0) : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}  
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Waste</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Product Info */}
          {product && (
            <div className="bg-slate-50 rounded-lg p-3 space-y-1">
              <p className="text-base font-semibold text-slate-800">{product.name}</p>
              {product.sku && (
                <p className="text-sm text-slate-600">SKU: {product.sku}</p>
              )}
              <p className="text-sm text-slate-600">
                Available: {product.warehouseQuantity || 0} units
              </p>
            </div>
          )}

          {/* Batch Selection (if product has batches) */}
          {batches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.selectedBatchId || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  selectedBatchId: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a batch</option>
                {batches.map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.totalQuantity} units - Exp: {new Date(batch.expirationDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <p className="text-xs text-slate-500 mt-1">
                  Maximum available: {selectedBatch.totalQuantity} units
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity to Waste <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={maxQuantity}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Waste Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Waste Reason <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {(['EXPIRED', 'BROKEN', 'DAMAGED', 'OTHER'] as const).map(reason => (
                <label key={reason} className="flex items-center">
                  <input
                    type="radio"
                    name="wasteReason"
                    value={reason}
                    checked={formData.wasteReason === reason}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      wasteReason: e.target.value as typeof formData.wasteReason,
                      notes: e.target.value !== 'OTHER' ? '' : prev.notes
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-slate-700 capitalize">{reason.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes (if Other selected) */}
          {formData.wasteReason === 'OTHER' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Please provide details"
                required
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Recording...' : 'Waste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

