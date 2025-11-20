import { useState, useEffect } from 'react';
import ProductList from '../components/Operations/ProductList';
import CreateProduct from '../components/Operations/CreateProduct';
import EditProduct from '../components/Operations/EditProduct';

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
  views?: number;
  orders?: number;
  sales?: number;
  subscribers?: number;
}

export default function InventoryOperations() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: 'Fountain Pen',
      price: 2.00,
      description: 'High-quality fountain pen for writing enthusiasts.',
      category: 'Stationery',
      image: null,
      views: 59,
      orders: 1,
      sales: 0.00
    },
    {
      id: 2,
      name: 'Writer\'s Notebook',
      price: 10.00,
      description: 'Premium notebook for creative writing.',
      category: 'Stationery',
      image: null,
      views: 62,
      orders: 0,
      sales: 0.00
    },
    {
      id: 3,
      name: 'Writer\'s Club',
      price: 0.00,
      description: 'Join our exclusive writer\'s community.',
      category: 'Community',
      image: null,
      views: 156,
      orders: 0,
      sales: 0.00,
      subscribers: 1
    },
    {
      id: 4,
      name: 'Character Development Checklist',
      price: 0.00,
      description: 'Comprehensive checklist for character development.',
      category: 'Resources',
      image: null,
      views: 41,
      orders: 9,
      sales: 0.00
    },
    {
      id: 5,
      name: 'Writing Prompts Collection',
      price: 5.99,
      description: 'A curated collection of creative writing prompts.',
      category: 'Resources',
      image: null,
      views: 78,
      orders: 3,
      sales: 17.97
    }
  ]);

  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingProductId, setEditingProductId] = useState<string | number | null>(null);

  const addProduct = (product: Product) => {
    const newProduct: Product = {
      ...product,
      id: product.id || Date.now(),
      views: 0,
      orders: 0,
      sales: 0.00,
      category: product.category || 'General'
    };
    setProducts([...products, newProduct]);
    setCurrentView('list');
  };

  const updateProduct = (originalId: string | number, updatedProduct: Product) => {
    setProducts(products.map(product => {
      if (String(product.id) !== String(originalId)) {
        return product;
      }

      const sanitizedId = typeof updatedProduct.id === 'string'
        ? updatedProduct.id.trim()
        : updatedProduct.id;

      const nextId = sanitizedId !== undefined && sanitizedId !== null && sanitizedId !== ''
        ? sanitizedId
        : product.id;

      return {
        ...product,
        ...updatedProduct,
        id: nextId
      };
    }));
    setCurrentView('list');
    setEditingProductId(null);
  };

  const deleteProduct = (id: string | number) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const handleEdit = (id: string | number) => {
    setEditingProductId(id);
    setCurrentView('edit');
  };

  const handleCreate = () => {
    setCurrentView('create');
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingProductId(null);
  };

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('inventoryProducts');
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        }
      } catch (e) {
        console.error('Error loading products from localStorage', e);
      }
    }
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('inventoryProducts', JSON.stringify(products));
    }
  }, [products]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <header className="sticky top-0 z-10 border-b border-indigo-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Inventory Operations
              </h1>
              <p className="text-sm text-slate-600 mt-1">Manage your product inventory</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {currentView === 'list' && (
          <ProductList 
            products={products} 
            onDelete={deleteProduct}
            onEdit={handleEdit}
            onCreate={handleCreate}
          />
        )}
        {currentView === 'create' && (
          <CreateProduct 
            onAdd={addProduct}
            onCancel={handleCancel}
          />
        )}
        {currentView === 'edit' && editingProductId && (
          <EditProduct 
            products={products}
            productId={editingProductId}
            onUpdate={updateProduct}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
