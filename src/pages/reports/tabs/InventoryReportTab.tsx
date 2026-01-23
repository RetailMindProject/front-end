import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, X, Package, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi, type CategoryDTO, type ProductDTO } from '../../../services/products.api';
import { storeProductsApi } from '../../../services/store-products.api';

interface InventoryProduct {
  productId: number;
  productName: string;
  sku?: string;
  brand?: string;
  category: string;
  cost: number;
  price: number;
  warehouseQuantity: number;
  storeQuantity: number;
  totalQuantity: number;
  totalValue: number;
  warehouseValue: number;
  storeValue: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

interface CategoryInventorySummary {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
  percentage: number;
}

type StockStatus = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

export default function InventoryReportTab() {
  const [loading, setLoading] = useState(false);
  // Note: legacy pagination state (unused). Summary tables have their own paging below.
  // Keeping as placeholders for future server-side pagination support.
  const [, setPage] = useState(0);
  
  // Pagination for summary tables
  const [valueReportPage, setValueReportPage] = useState(0);
  const [lowStockPage, setLowStockPage] = useState(0);
  const [outOfStockPage, setOutOfStockPage] = useState(0);
  const [categoryPage, setCategoryPage] = useState(0);
  const summaryPageSize = 10;
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<StockStatus>('all');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  // Data
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [allFilteredProducts, setAllFilteredProducts] = useState<InventoryProduct[]>([]);

  // Summary data
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalInventoryValue: 0,
    warehouseValue: 0,
    storeValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchInventoryData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventoryProducts, selectedCategory, selectedBrand, productSearch, stockStatus, lowStockThreshold]);

  useEffect(() => {
    calculateSummary();
  }, [allFilteredProducts, lowStockThreshold]);

  const fetchCategories = async () => {
    try {
      const res = await productsApi.getCategories();
      if (res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // Fetch all products
      let allProducts: ProductDTO[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const res = await productsApi.filter({
          page,
          size: pageSize,
          isActive: true,
        });

        if (!res.data) break;

        const content = Array.isArray(res.data) ? res.data : res.data.content || [];
        allProducts = allProducts.concat(content);

        if (typeof res.data === 'object' && 'totalPages' in res.data) {
          const totalPages = (res.data as any).totalPages || 0;
          hasMore = page < totalPages - 1;
        } else {
          hasMore = content.length === pageSize;
        }
        page++;
      }

      // Fetch inventory quantities for each product
      const productsWithInventory: InventoryProduct[] = [];
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 20;
      for (let i = 0; i < allProducts.length; i += batchSize) {
        const batch = allProducts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (product) => {
            try {
              const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
              const stockRes = await storeProductsApi.getByProductId(productId);
              
              let warehouseQty = 0;
              let storeQty = 0;
              
              if (stockRes.data) {
                warehouseQty = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
                storeQty = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
              }

              // Get category name
              let categoryName = 'Uncategorized';
              if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
                categoryName = product.categories[0].name;
              } else if (typeof product.category === 'string') {
                categoryName = product.category;
              } else if (product.category && typeof product.category === 'object' && 'name' in product.category) {
                categoryName = (product.category as any).name;
              }

              const cost = product.cost || product.defaultCost || 0;
              const price = product.price || product.defaultPrice || 0;
              const totalQty = warehouseQty + storeQty;
              const warehouseValue = warehouseQty * cost;
              const storeValue = storeQty * cost;
              const totalValue = totalQty * cost;

              return {
                productId,
                productName: product.name,
                sku: product.sku,
                brand: product.brand,
                category: categoryName,
                cost,
                price,
                warehouseQuantity: warehouseQty,
                storeQuantity: storeQty,
                totalQuantity: totalQty,
                totalValue,
                warehouseValue,
                storeValue,
                isLowStock: totalQty > 0 && totalQty < lowStockThreshold,
                isOutOfStock: totalQty === 0,
              };
            } catch (err) {
              console.warn(`Error fetching inventory for product ${product.id}:`, err);
              // Return product with 0 quantities
              const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
              const cost = product.cost || product.defaultCost || 0;
              const price = product.price || product.defaultPrice || 0;
              
              let categoryName = 'Uncategorized';
              if (product.categories && Array.isArray(product.categories) && product.categories.length > 0) {
                categoryName = product.categories[0].name;
              } else if (typeof product.category === 'string') {
                categoryName = product.category;
              }

              return {
                productId,
                productName: product.name,
                sku: product.sku,
                brand: product.brand,
                category: categoryName,
                cost,
                price,
                warehouseQuantity: 0,
                storeQuantity: 0,
                totalQuantity: 0,
                totalValue: 0,
                warehouseValue: 0,
                storeValue: 0,
                isLowStock: false,
                isOutOfStock: true,
              };
            }
          })
        );
        productsWithInventory.push(...batchResults);
      }

      setInventoryProducts(productsWithInventory);
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...inventoryProducts];

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter((p) => p.brand?.toLowerCase().includes(selectedBrand.toLowerCase()));
    }

    // Product search
    if (productSearch.trim()) {
      const searchLower = productSearch.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const nameMatch = p.productName.toLowerCase().includes(searchLower);
        const skuMatch = p.sku?.toLowerCase().includes(searchLower);
        const idMatch = String(p.productId).includes(searchLower);
        return nameMatch || skuMatch || idMatch;
      });
    }

    // Stock status filter
    if (stockStatus === 'low-stock') {
      filtered = filtered.filter((p) => p.isLowStock);
    } else if (stockStatus === 'out-of-stock') {
      filtered = filtered.filter((p) => p.isOutOfStock);
    } else if (stockStatus === 'in-stock') {
      filtered = filtered.filter((p) => !p.isOutOfStock);
    }

    setAllFilteredProducts(filtered);
    
    // Reset pagination
    setPage(0);
    setValueReportPage(0);
    setLowStockPage(0);
    setOutOfStockPage(0);
    setCategoryPage(0);
  };

  const calculateSummary = () => {
    const summaryData = {
      totalProducts: allFilteredProducts.length,
      totalInventoryValue: 0,
      warehouseValue: 0,
      storeValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    };

    allFilteredProducts.forEach((product) => {
      summaryData.totalInventoryValue += product.totalValue;
      summaryData.warehouseValue += product.warehouseValue;
      summaryData.storeValue += product.storeValue;
      if (product.isLowStock) summaryData.lowStockItems++;
      if (product.isOutOfStock) summaryData.outOfStockItems++;
    });

    setSummary(summaryData);
  };

  // Inventory Value Report (sorted by value, highest first)
  const inventoryValueReport = useMemo(() => {
    return [...allFilteredProducts]
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [allFilteredProducts]);

  // Paginated inventory value report
  const paginatedValueReport = useMemo(() => {
    const startIndex = valueReportPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return inventoryValueReport.slice(startIndex, endIndex);
  }, [inventoryValueReport, valueReportPage]);
  const valueReportTotalPages = Math.ceil(inventoryValueReport.length / summaryPageSize);

  // Low Stock Alerts
  const lowStockProducts = useMemo(() => {
    return allFilteredProducts
      .filter((p) => p.isLowStock)
      .sort((a, b) => a.totalQuantity - b.totalQuantity); // Sort by quantity (lowest first)
  }, [allFilteredProducts, lowStockThreshold]);

  // Paginated low stock
  const paginatedLowStock = useMemo(() => {
    const startIndex = lowStockPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return lowStockProducts.slice(startIndex, endIndex);
  }, [lowStockProducts, lowStockPage]);
  const lowStockTotalPages = Math.ceil(lowStockProducts.length / summaryPageSize);

  // Out of Stock Items
  const outOfStockProducts = useMemo(() => {
    return allFilteredProducts
      .filter((p) => p.isOutOfStock)
      .sort((a, b) => a.productName.localeCompare(b.productName)); // Sort alphabetically
  }, [allFilteredProducts]);

  // Paginated out of stock
  const paginatedOutOfStock = useMemo(() => {
    const startIndex = outOfStockPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return outOfStockProducts.slice(startIndex, endIndex);
  }, [outOfStockProducts, outOfStockPage]);
  const outOfStockTotalPages = Math.ceil(outOfStockProducts.length / summaryPageSize);

  // Inventory by Category
  const categoryInventory = useMemo(() => {
    const categoryMap = new Map<string, CategoryInventorySummary>();
    const totalValue = allFilteredProducts.reduce((sum, p) => sum + p.totalValue, 0);

    allFilteredProducts.forEach((product) => {
      const category = product.category || 'Uncategorized';
      const existing = categoryMap.get(category);
      if (existing) {
        existing.productCount += 1;
        existing.totalQuantity += product.totalQuantity;
        existing.totalValue += product.totalValue;
      } else {
        categoryMap.set(category, {
          category,
          productCount: 1,
          totalQuantity: product.totalQuantity,
          totalValue: product.totalValue,
          percentage: 0,
        });
      }
    });

    return Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentage: totalValue > 0 ? (cat.totalValue / totalValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [allFilteredProducts]);

  // Paginated category inventory
  const paginatedCategoryInventory = useMemo(() => {
    const startIndex = categoryPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return categoryInventory.slice(startIndex, endIndex);
  }, [categoryInventory, categoryPage]);
  const categoryTotalPages = Math.ceil(categoryInventory.length / summaryPageSize);

  // Get unique brands for filter
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    inventoryProducts.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [inventoryProducts]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedBrand('');
    setProductSearch('');
    setStockStatus('all');
    setPage(0);
  };

  // Export Inventory Value Report
  const handleExportInventoryValue = () => {
    const headers = ['Product', 'SKU', 'Category', 'Brand', 'Warehouse Qty', 'Store Qty', 'Total Qty', 'Cost', 'Warehouse Value', 'Store Value', 'Total Value'];
    
    const rows = inventoryValueReport.map((product) => [
      product.productName,
      product.sku || '',
      product.category,
      product.brand || '',
      product.warehouseQuantity,
      product.storeQuantity,
      product.totalQuantity,
      product.cost.toFixed(2),
      product.warehouseValue.toFixed(2),
      product.storeValue.toFixed(2),
      product.totalValue.toFixed(2),
    ]);

    const totals = inventoryValueReport.reduce((acc, p) => {
      acc.warehouseQty += p.warehouseQuantity;
      acc.storeQty += p.storeQuantity;
      acc.totalQty += p.totalQuantity;
      acc.warehouseValue += p.warehouseValue;
      acc.storeValue += p.storeValue;
      acc.totalValue += p.totalValue;
      return acc;
    }, { warehouseQty: 0, storeQty: 0, totalQty: 0, warehouseValue: 0, storeValue: 0, totalValue: 0 });

    const totalsRow = [
      'TOTAL',
      '',
      '',
      '',
      totals.warehouseQty,
      totals.storeQty,
      totals.totalQty,
      '',
      totals.warehouseValue.toFixed(2),
      totals.storeValue.toFixed(2),
      totals.totalValue.toFixed(2),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      totalsRow.map((cell) => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-value-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Low Stock Alerts
  const handleExportLowStock = () => {
    const headers = ['Product', 'SKU', 'Category', 'Brand', 'Warehouse Qty', 'Store Qty', 'Total Qty', 'Cost', 'Total Value'];
    
    const rows = lowStockProducts.map((product) => [
      product.productName,
      product.sku || '',
      product.category,
      product.brand || '',
      product.warehouseQuantity,
      product.storeQuantity,
      product.totalQuantity,
      product.cost.toFixed(2),
      product.totalValue.toFixed(2),
    ]);

    const totals = lowStockProducts.reduce((acc, p) => {
      acc.totalQty += p.totalQuantity;
      acc.totalValue += p.totalValue;
      return acc;
    }, { totalQty: 0, totalValue: 0 });

    const totalsRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      totals.totalQty,
      '',
      totals.totalValue.toFixed(2),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      totalsRow.map((cell) => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low-stock-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Out of Stock Items
  const handleExportOutOfStock = () => {
    const headers = ['Product', 'SKU', 'Category', 'Brand', 'Cost', 'Price'];
    
    const rows = outOfStockProducts.map((product) => [
      product.productName,
      product.sku || '',
      product.category,
      product.brand || '',
      product.cost.toFixed(2),
      product.price.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `out-of-stock-items-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Inventory by Category
  const handleExportCategoryInventory = () => {
    const headers = ['Category', 'Product Count', 'Total Quantity', 'Total Value', 'Percentage'];
    
    const rows = categoryInventory.map((cat) => [
      cat.category,
      cat.productCount,
      cat.totalQuantity,
      cat.totalValue.toFixed(2),
      cat.percentage.toFixed(2) + '%',
    ]);

    const totals = categoryInventory.reduce((acc, cat) => {
      acc.productCount += cat.productCount;
      acc.totalQuantity += cat.totalQuantity;
      acc.totalValue += cat.totalValue;
      return acc;
    }, { productCount: 0, totalQuantity: 0, totalValue: 0 });

    const totalsRow = [
      'TOTAL',
      totals.productCount,
      totals.totalQuantity,
      totals.totalValue.toFixed(2),
      '100.00%',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      totalsRow.map((cell) => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-by-category-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </h3>
          <button
            onClick={handleResetFilters}
            className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Brands</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search Product</label>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Name or SKU"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock Status</label>
            <select
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value as StockStatus);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Low Stock Threshold</label>
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 10;
                setLowStockThreshold(value);
                setPage(0);
              }}
              min="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-slate-800">{summary.totalProducts}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Inventory Value</p>
          <p className="text-2xl font-bold text-green-600">${summary.totalInventoryValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Warehouse Value</p>
          <p className="text-2xl font-bold text-blue-600">${summary.warehouseValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Store Value</p>
          <p className="text-2xl font-bold text-indigo-600">${summary.storeValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Low Stock Items</p>
          <p className="text-2xl font-bold text-orange-600">{summary.lowStockItems}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{summary.outOfStockItems}</p>
        </div>
      </div>

      {/* Inventory Value Report */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Inventory Value Report</h3>
          <button
            onClick={handleExportInventoryValue}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading inventory data...</div>
        ) : paginatedValueReport.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No inventory data available</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Brand</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Warehouse Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Store Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Total Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Warehouse Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Store Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedValueReport.map((product) => (
                    <tr key={product.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.brand || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{product.warehouseQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{product.storeQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-slate-800">{product.totalQuantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.warehouseValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.storeValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${product.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {valueReportTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {valueReportPage + 1} of {valueReportTotalPages} {inventoryValueReport.length > 0 && `(${inventoryValueReport.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setValueReportPage(prev => Math.max(0, prev - 1))}
                    disabled={valueReportPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(valueReportTotalPages, 9) }).map((_, i) => {
                    let pageNum = i;
                    if (valueReportPage > 4 && valueReportTotalPages > 9) {
                      pageNum = Math.min(valueReportPage - 4 + i, valueReportTotalPages - 1);
                    }
                    if (pageNum < 0) pageNum = 0;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setValueReportPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          valueReportPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setValueReportPage(prev => Math.min(valueReportTotalPages - 1, prev + 1))}
                    disabled={valueReportPage >= valueReportTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-slate-800">Low Stock Alerts</h3>
          </div>
          <button
            onClick={handleExportLowStock}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading...</div>
        ) : lowStockProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No low stock items found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Warehouse Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Store Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Total Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedLowStock.map((product) => (
                    <tr key={product.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{product.warehouseQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{product.storeQuantity}</td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-orange-600">{product.totalQuantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {lowStockTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {lowStockPage + 1} of {lowStockTotalPages} {lowStockProducts.length > 0 && `(${lowStockProducts.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLowStockPage(prev => Math.max(0, prev - 1))}
                    disabled={lowStockPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(lowStockTotalPages, 9) }).map((_, i) => {
                    let pageNum = i;
                    if (lowStockPage > 4 && lowStockTotalPages > 9) {
                      pageNum = Math.min(lowStockPage - 4 + i, lowStockTotalPages - 1);
                    }
                    if (pageNum < 0) pageNum = 0;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setLowStockPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          lowStockPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setLowStockPage(prev => Math.min(lowStockTotalPages - 1, prev + 1))}
                    disabled={lowStockPage >= lowStockTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Out of Stock Items */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-800">Out of Stock Items</h3>
          </div>
          <button
            onClick={handleExportOutOfStock}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading...</div>
        ) : outOfStockProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No out of stock items found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Brand</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedOutOfStock.map((product) => (
                    <tr key={product.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{product.brand || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${product.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {outOfStockTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {outOfStockPage + 1} of {outOfStockTotalPages} {outOfStockProducts.length > 0 && `(${outOfStockProducts.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOutOfStockPage(prev => Math.max(0, prev - 1))}
                    disabled={outOfStockPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(outOfStockTotalPages, 9) }).map((_, i) => {
                    let pageNum = i;
                    if (outOfStockPage > 4 && outOfStockTotalPages > 9) {
                      pageNum = Math.min(outOfStockPage - 4 + i, outOfStockTotalPages - 1);
                    }
                    if (pageNum < 0) pageNum = 0;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setOutOfStockPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          outOfStockPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setOutOfStockPage(prev => Math.min(outOfStockTotalPages - 1, prev + 1))}
                    disabled={outOfStockPage >= outOfStockTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inventory by Category */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Inventory by Category</h3>
          <button
            onClick={handleExportCategoryInventory}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading...</div>
        ) : categoryInventory.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No category data available</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Product Count</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Total Quantity</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedCategoryInventory.map((category) => (
                    <tr key={category.category} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{category.category}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{category.productCount}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{category.totalQuantity}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${category.totalValue.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${category.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600 w-12 text-right">{category.percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {categoryTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {categoryPage + 1} of {categoryTotalPages} {categoryInventory.length > 0 && `(${categoryInventory.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCategoryPage(prev => Math.max(0, prev - 1))}
                    disabled={categoryPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(categoryTotalPages, 9) }).map((_, i) => {
                    let pageNum = i;
                    if (categoryPage > 4 && categoryTotalPages > 9) {
                      pageNum = Math.min(categoryPage - 4 + i, categoryTotalPages - 1);
                    }
                    if (pageNum < 0) pageNum = 0;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCategoryPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          categoryPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCategoryPage(prev => Math.min(categoryTotalPages - 1, prev + 1))}
                    disabled={categoryPage >= categoryTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
