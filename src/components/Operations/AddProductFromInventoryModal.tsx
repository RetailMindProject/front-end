import { useState } from 'react';
import type { ChangeEvent } from 'react';

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
}

interface AddProductFromInventoryModalProps {
  inventoryProducts: Product[];
  storeProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

const AddProductFromInventoryModal = ({ inventoryProducts, storeProducts, isOpen, onClose, onSelect }: AddProductFromInventoryModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  if (!isOpen) return null;

  const availableProducts = inventoryProducts.filter(
    invProduct => !storeProducts.some(storeProduct => storeProduct.id === invProduct.id)
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      const results = availableProducts.filter(product =>
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

  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const displayProducts = isSearching ? searchResults : availableProducts;

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
        
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search inventory products..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="mt-2 text-sm text-slate-600">
              {isSearching 
                ? `${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found`
                : `${availableProducts.length} available product${availableProducts.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>

          {displayProducts.length > 0 ? (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {displayProducts.map(product => (
                <div 
                  key={product.id} 
                  className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex-shrink-0">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-slate-800 mb-1">{product.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{product.category || 'No category'}</span>
                      <span className="font-medium text-blue-600">${(product.price || 0).toFixed(2)}</span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(product);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Add to Store
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-2">No products available to add.</p>
              <p className="text-sm text-slate-500">
                {availableProducts.length === 0 && inventoryProducts.length > 0
                  ? 'All inventory products are already in the store.'
                  : 'No products in inventory.'}
              </p>
            </div>
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
