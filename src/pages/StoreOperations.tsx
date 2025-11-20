import { useState, useEffect } from 'react';
import StoreManager from '../components/Operations/StoreManager';

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
}

export default function StoreOperations() {
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);

  // Load inventory products from localStorage
  const getInventoryProducts = (): Product[] => {
    const savedProducts = localStorage.getItem('inventoryProducts');
    if (savedProducts) {
      try {
        return JSON.parse(savedProducts);
      } catch (e) {
        console.error('Error loading inventory products', e);
      }
    }
    return [];
  };

  const addProductFromInventory = (product: Product) => {
    const storeProduct: Product = {
      ...product,
      orders: 0,
      sales: 0.00
    };
    setStoreProducts([...storeProducts, storeProduct]);
  };

  const deleteStoreProduct = (id: string | number) => {
    setStoreProducts(storeProducts.filter(product => product.id !== id));
  };

  // Load store products from localStorage on mount
  useEffect(() => {
    const savedStoreProducts = localStorage.getItem('storeProducts');
    if (savedStoreProducts) {
      try {
        setStoreProducts(JSON.parse(savedStoreProducts));
      } catch (e) {
        console.error('Error loading store products from localStorage', e);
      }
    }
  }, []);

  // Save store products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('storeProducts', JSON.stringify(storeProducts));
  }, [storeProducts]);

  const inventoryProducts = getInventoryProducts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <header className="sticky top-0 z-10 border-b border-indigo-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
              <span className="text-2xl">🏪</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Store Operations
              </h1>
              <p className="text-sm text-slate-600 mt-1">Manage products available in the store</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <StoreManager 
          storeProducts={storeProducts}
          inventoryProducts={inventoryProducts}
          onDelete={deleteStoreProduct}
          onAddFromInventory={addProductFromInventory}
        />
      </div>
    </div>
  );
}
