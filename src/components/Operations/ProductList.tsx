import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import ProductViewModal from './ProductViewModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

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
  orders?: number;
  sales?: number;
  views?: number;
  subscribers?: number;
}

interface ProductListProps {
  products: Product[];
  onDelete: (id: string | number) => void;
  onEdit: (id: string | number) => void;
  onCreate: () => void;
}

const ProductList = ({ products, onDelete, onEdit, onCreate }: ProductListProps) => {
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

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span className="text-lg transition-transform duration-200 hover:rotate-90">+</span>
          Add new product
        </button>
      </div>

      {/* Search Section */}
      <div className="px-6 py-4 border-b bg-slate-50/50">
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search for product"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
            >
              Search
            </button>
          </form>
          
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-slate-600">
              {isSearching ? `${searchResults.length} product${searchResults.length !== 1 ? 's' : ''} found` : `${products.length} products`}
            </span>
            {isSearching && (
              <button 
                onClick={clearSearch} 
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Products List */}
      {displayProducts.length > 0 ? (
        <div className="divide-y divide-slate-200">
          {displayProducts.map(product => (
            <div 
              key={product.id} 
              className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/50 transition-all duration-200 ease-in-out border-b border-slate-100 last:border-b-0 group"
            >
              {/* Product Image/Icon */}
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
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200">{product.name}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600 group-hover:text-slate-700 transition-colors duration-200">
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">{product.views || 0} views</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">{product.orders || 0} orders</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">${(product.sales || 0).toFixed(2)} sales</span>
                  <span className="font-medium text-blue-600 group-hover:text-blue-700 transition-colors duration-200">${(product.price || 0).toFixed(2)} price</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={() => onEdit(product.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleViewProduct(product)}
                  className="px-4 py-2 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                >
                  View
                </button>
                <button 
                  onClick={() => handleDelete(product.id, product.name)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 hover:shadow-sm text-red-700 font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <span>+</span>
            Add New Product
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
