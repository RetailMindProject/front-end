import { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Filter, X, Calendar, List, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsApi, type CategoryDTO, type ProductDTO } from '../../../services/products.api';
import { ordersApi } from '../../../services/orders.api';
import { sessionsApi } from '../../../services/sessions.api';
import { reportsApi } from '../../../services/reports.api';

interface SalesRow {
  date: string;
  time: string;
  invoiceId: string;
  cashier: string;
  cashierId?: number;
  customerName: string | null;
  customerPhone: string | null;
  itemsCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  orderId: number;
  sessionId: number;
  paidAt: string | null;
  createdAt: string;
  notes?: string | null;
  // Keep these for summary view compatibility
  productName?: string;
  productId?: number;
  category?: string;
}

interface ProductSummary {
  productId: number;
  productName: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
  avgPrice: number;
}

interface CategorySummary {
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
  percentage: number;
}

type ViewMode = 'summary' | 'detail';
type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function SalesReportTab() {
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  
  // Pagination for summary tables
  const [productsPage, setProductsPage] = useState(0);
  const [categoriesPage, setCategoriesPage] = useState(0);
  const summaryPageSize = 10;
  
  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCashier, setSelectedCashier] = useState<string>('');
  const [cashiers, setCashiers] = useState<{ id: number; name: string }[]>([]);

  // Data
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [allFilteredData, setAllFilteredData] = useState<SalesRow[]>([]);

  // Summary data
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    discounts: 0,
    totalTax: 0,
    refunds: 0,
    mostPopularProduct: null as { productId: number; productName: string; totalQuantity: number; totalRevenue: number } | null,
  });

  // Calculate date ranges for presets
  const getDateRange = (preset: DatePreset) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const from = new Date();
    from.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'today':
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'week':
        from.setDate(today.getDate() - 7);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'month':
        from.setMonth(today.getMonth() - 1);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'quarter':
        from.setMonth(today.getMonth() - 3);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'year':
        from.setFullYear(today.getFullYear() - 1);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      case 'custom':
        return { from: dateFrom, to: dateTo };
      default:
        return { from: '', to: '' };
    }
  };

  // Fetch cashiers for filter dropdown
  const fetchCashiers = async () => {
    try {
      const sessions = await sessionsApi.fetchSessions();
      if (sessions) {
        // Extract unique cashiers
        const cashierMap = new Map<number, string>();
        sessions.forEach(session => {
          if (session.cashierId && !cashierMap.has(session.cashierId)) {
            cashierMap.set(session.cashierId, `${session.firstName} ${session.lastName}`);
          }
        });
        setCashiers(Array.from(cashierMap.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (err) {
      console.error('Failed to fetch cashiers:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchCashiers();
  }, []);

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  // Fetch summary from API - gracefully handle if endpoint doesn't exist yet
  const fetchSummary = useCallback(async () => {
    try {
      const dateRange = getDateRange(datePreset);
      const fromDate = dateRange.from || dateFrom;
      const toDate = dateRange.to || dateTo;

      const result = await reportsApi.getSummary({
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      if (result.data) {
        setSummary({
          totalSales: result.data.totalSales || 0,
          totalOrders: result.data.totalOrders || 0,
          avgOrderValue: result.data.averageOrderValue || 0,
          discounts: result.data.totalDiscount || 0,
          totalTax: result.data.totalTax || 0,
          refunds: 0, // TODO: Add refunds to backend response
          mostPopularProduct: result.data.mostPopularProduct || null,
        });
      } else {
        // If API fails, calculate from allFilteredData as fallback
        // This ensures the page still works even if the summary endpoint doesn't exist
        console.warn('Summary API not available, calculating from order data');
        if (allFilteredData.length > 0) {
          const totals = allFilteredData.reduce((acc, row) => {
            acc.totalSales += row.total;
            acc.totalOrders += 1;
            acc.discounts += row.discount;
            acc.totalTax += row.tax;
            return acc;
          }, { totalSales: 0, totalOrders: 0, discounts: 0, totalTax: 0 });

          setSummary({
            totalSales: totals.totalSales,
            totalOrders: totals.totalOrders,
            avgOrderValue: totals.totalOrders > 0 ? totals.totalSales / totals.totalOrders : 0,
            discounts: totals.discounts,
            totalTax: totals.totalTax,
            refunds: 0,
            mostPopularProduct: null,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      // Don't set defaults here - let it use existing summary state
      // This prevents clearing the summary if there's a temporary network error
    }
  }, [datePreset, dateFrom, dateTo, allFilteredData]);

  useEffect(() => {
    fetchSalesData();
  }, [page, pageSize, dateFrom, dateTo, datePreset, selectedCategory, productSearch, selectedCashier, viewMode]);

  // Fetch summary from API
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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

  const fetchProducts = async () => {
    try {
      const res = await productsApi.filter({ page: 0, size: 1000 });
      if (res.data) {
        const content = Array.isArray(res.data) ? res.data : res.data.content || [];
        
        // Fetch categories for products that don't have them
        const productsWithCategories = await Promise.all(
          content.map(async (product) => {
            // If product already has category info, return as is
            if (product.categories && product.categories.length > 0) {
              return product;
            }
            if (product.productCategory?.category) {
              return product;
            }
            if (typeof product.category === 'string' && product.category) {
              return product;
            }
            
            // Otherwise, fetch categories for this product
            if (product.id) {
              try {
                const catRes = await productsApi.getProductCategories(product.id);
                if (catRes.data && catRes.data.length > 0) {
                  return {
                    ...product,
                    categories: catRes.data,
                  };
                }
              } catch (err) {
                console.error(`Failed to fetch categories for product ${product.id}:`, err);
              }
            }
            return product;
          })
        );
        
        setProducts(productsWithCategories);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };


  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Get date range from preset or custom dates
      const dateRange = getDateRange(datePreset);
      const fromDate = dateRange.from || dateFrom;
      const toDate = dateRange.to || dateTo;

      // Extract cashier name if selected
      const cashierName = selectedCashier.includes(':') 
        ? selectedCashier.split(':')[1] 
        : selectedCashier;

      // Call the new backend endpoint
      const result = await ordersApi.getOrdersReport({
        from: fromDate || undefined,
        to: toDate || undefined,
        cashierName: cashierName || undefined,
        status: 'PAID',
        limit: pageSize,
        offset: page * pageSize,
        orderBy: 'date',
        orderDirection: 'DESC',
      });

      if (result.error) {
        console.error('Failed to fetch sales data:', result.error);
        setSalesData([]);
        setAllFilteredData([]);
        setTotalPages(0);
        return;
      }

      if (!result.data) {
        setSalesData([]);
        setAllFilteredData([]);
        setTotalPages(0);
        return;
      }

      // Map OrderReportItem to SalesRow format
      const salesRows: SalesRow[] = result.data.items.map(item => ({
        date: item.date,
        time: item.time,
        invoiceId: item.orderNumber,
        cashier: item.cashierName,
        cashierId: item.cashierId,
        customerName: item.customerName,
        customerPhone: item.customerPhone,
        itemsCount: item.itemCount,
        subtotal: item.subtotal,
        discount: item.discountAmount,
        tax: item.taxAmount,
        total: item.grandTotal,
        paymentMethod: item.paymentMethod,
        status: item.status,
        orderId: item.orderId,
        sessionId: item.sessionId,
        paidAt: item.paidAt,
        createdAt: item.createdAt,
        notes: item.notes || null,
      }));

      // For product/category summaries, we still need all order data
      // But summary KPIs come from the reports API endpoint
      if (viewMode === 'summary') {
        // Fetch all data for product/category summaries (still needed for those tables)
        const allDataResult = await ordersApi.getOrdersReport({
          from: fromDate || undefined,
          to: toDate || undefined,
          cashierName: cashierName || undefined,
          status: 'PAID',
          limit: 10000, // Large limit to get all data for product/category summaries
          offset: 0,
          orderBy: 'date',
          orderDirection: 'DESC',
        });

        if (allDataResult.data) {
          const allRows: SalesRow[] = allDataResult.data.items.map(item => ({
            date: item.date,
            time: item.time,
            invoiceId: item.orderNumber,
            cashier: item.cashierName,
            cashierId: item.cashierId,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
            itemsCount: item.itemCount,
            subtotal: item.subtotal,
            discount: item.discountAmount,
            tax: item.taxAmount,
            total: item.grandTotal,
            paymentMethod: item.paymentMethod,
            status: item.status,
            orderId: item.orderId,
            sessionId: item.sessionId,
            paidAt: item.paidAt,
            createdAt: item.createdAt,
            notes: item.notes || null,
          }));
          setAllFilteredData(allRows);
        }
      } else {
        // For detail view, just use current page data
        setAllFilteredData(salesRows);
      }

      setSalesData(salesRows);
      setTotalOrders(result.data.total);
      setTotalPages(Math.ceil(result.data.total / pageSize));
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
      setSalesData([]);
      setAllFilteredData([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };


  // Calculate product summaries
  const productSummaries = useMemo(() => {
    const productMap = new Map<number, ProductSummary>();

    allFilteredData.forEach((row) => {
      if (!row.productId) return;
      
      const existing = productMap.get(row.productId);
      if (existing) {
        existing.totalQuantity += row.itemsCount;
        existing.totalRevenue += row.total;
        existing.transactionCount += 1;
        existing.avgPrice = existing.totalRevenue / existing.totalQuantity;
      } else {
        productMap.set(row.productId, {
          productId: row.productId,
          productName: row.productName || 'Unknown',
          category: row.category || 'Uncategorized',
          totalQuantity: row.itemsCount,
          totalRevenue: row.total,
          transactionCount: 1,
          avgPrice: row.total / row.itemsCount,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allFilteredData]);
  
  // Paginated product summaries
  const paginatedProductSummaries = useMemo(() => {
    const startIndex = productsPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return productSummaries.slice(startIndex, endIndex);
  }, [productSummaries, productsPage]);
  
  const productsTotalPages = Math.ceil(productSummaries.length / summaryPageSize);

  // Calculate category summaries
  const categorySummaries = useMemo(() => {
    const categoryMap = new Map<string, CategorySummary>();
    const totalRevenue = allFilteredData.reduce((sum, row) => sum + row.total, 0);

    allFilteredData.forEach((row) => {
      const category = row.category || 'Uncategorized';
      const existing = categoryMap.get(category);
      if (existing) {
        existing.totalQuantity += row.itemsCount;
        existing.totalRevenue += row.total;
        existing.transactionCount += 1;
      } else {
        categoryMap.set(category, {
          category,
          totalQuantity: row.itemsCount,
          totalRevenue: row.total,
          transactionCount: 1,
          percentage: 0,
        });
      }
    });

    return Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalRevenue > 0 ? (cat.totalRevenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allFilteredData]);
  
  // Paginated category summaries
  const paginatedCategorySummaries = useMemo(() => {
    const startIndex = categoriesPage * summaryPageSize;
    const endIndex = startIndex + summaryPageSize;
    return categorySummaries.slice(startIndex, endIndex);
  }, [categorySummaries, categoriesPage]);
  
  const categoriesTotalPages = Math.ceil(categorySummaries.length / summaryPageSize);

  // Get product summary for searched product
  const searchedProductSummary = useMemo(() => {
    if (!productSearch.trim()) return null;

    const searchLower = productSearch.toLowerCase().trim();
    const matchingProduct = products.find(p => {
      const productIdMatch = String(p.id).includes(searchLower);
      const skuMatch = p.sku?.toLowerCase().includes(searchLower);
      const productNameMatch = p.name?.toLowerCase().includes(searchLower);
      return productIdMatch || skuMatch || productNameMatch;
    });

    if (!matchingProduct) return null;

    const productId = typeof matchingProduct.id === 'string' 
      ? parseInt(matchingProduct.id) 
      : matchingProduct.id;

    const productSales = allFilteredData.filter(row => row.productId === productId);
    const totalQuantity = productSales.reduce((sum, row) => sum + row.itemsCount, 0);
    const totalRevenue = productSales.reduce((sum, row) => sum + row.total, 0);
    const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

    return {
      product: matchingProduct,
      totalQuantity,
      totalRevenue,
      avgPrice,
      transactionCount: productSales.length,
    };
  }, [productSearch, products, allFilteredData]);

  const handleResetFilters = () => {
    setDatePreset('month');
    setDateFrom('');
    setDateTo('');
    setSelectedCategory('');
    setProductSearch('');
    setSelectedCashier('');
    setPage(0);
  };

  // Export Top Products
  const handleExportTopProducts = () => {
    const headers = ['Rank', 'Product', 'SKU', 'Category', 'Qty Sold', 'Revenue', 'Avg Price', 'Transactions'];
    
    const rows = productSummaries.map((product, idx) => {
      const productObj = products.find(p => {
        const productId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
        return productId === product.productId;
      });
      const sku = productObj?.sku || '';
      
      return [
        idx + 1,
        product.productName,
        sku,
        product.category,
        product.totalQuantity,
        product.totalRevenue.toFixed(2),
        product.avgPrice.toFixed(2),
        product.transactionCount,
      ];
    });
    
    // Add totals row
    const totals = productSummaries.reduce((acc, product) => {
      acc.qty += product.totalQuantity;
      acc.revenue += product.totalRevenue;
      acc.transactions += product.transactionCount;
      return acc;
    }, { qty: 0, revenue: 0, transactions: 0 });
    
    const totalsRow = [
      '',
      'TOTAL',
      '',
      '',
      totals.qty,
      totals.revenue.toFixed(2),
      '',
      totals.transactions,
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
    a.download = `top-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Sales by Category
  const handleExportSalesByCategory = () => {
    const headers = ['Category', 'Qty Sold', 'Revenue', 'Percentage', 'Transactions'];
    
    const rows = categorySummaries.map((category) => [
      category.category,
      category.totalQuantity,
      category.totalRevenue.toFixed(2),
      category.percentage.toFixed(2) + '%',
      category.transactionCount,
    ]);
    
    // Add totals row
    const totals = categorySummaries.reduce((acc, category) => {
      acc.qty += category.totalQuantity;
      acc.revenue += category.totalRevenue;
      acc.transactions += category.transactionCount;
      return acc;
    }, { qty: 0, revenue: 0, transactions: 0 });
    
    const totalsRow = [
      'TOTAL',
      totals.qty,
      totals.revenue.toFixed(2),
      '100.00%',
      totals.transactions,
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
    a.download = `sales-by-category-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Transaction Details
  const handleExportTransactionDetails = async () => {
    try {
      const dateRange = getDateRange(datePreset);
      const fromDate = dateRange.from || dateFrom;
      const toDate = dateRange.to || dateTo;
      
      const cashierName = selectedCashier.includes(':') 
        ? selectedCashier.split(':')[1] 
        : selectedCashier;

      const result = await reportsApi.exportReport({
        from: fromDate || undefined,
        to: toDate || undefined,
        cashierName: cashierName || undefined,
        status: 'PAID',
      });

      if (result.error) {
        console.error('Export failed:', result.error);
        alert('Failed to export report. Please try again.');
        return;
      }

      if (result.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = 'order-report.csv';
        a.click();
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(result.url!), 100);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report. Please try again.');
    }
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

        {/* Date Presets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'quarter', 'year', 'custom'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDatePreset(preset);
                  if (preset === 'custom') {
                    // Keep current custom dates
                  } else {
                    setPage(0);
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                  datePreset === preset
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range (shown when custom is selected) */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Other Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cashier</label>
            <select
              value={selectedCashier}
              onChange={(e) => {
                setSelectedCashier(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Cashiers</option>
              {cashiers.map((cashier) => (
                <option key={cashier.id} value={`${cashier.id}:${cashier.name}`}>
                  {cashier.name}
                </option>
              ))}
            </select>
          </div>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-green-600">${summary.totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-slate-800">{summary.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-slate-800">${summary.avgOrderValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Discounts</p>
          <p className="text-2xl font-bold text-yellow-600">${summary.discounts.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Tax</p>
          <p className="text-2xl font-bold text-slate-600">${summary.totalTax.toFixed(2)}</p>
        </div>
      </div>

      {/* Product Summary Card (when product is searched) */}
      {searchedProductSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{searchedProductSummary.product.name}</h3>
              {searchedProductSummary.product.sku && (
                <p className="text-sm text-slate-600">SKU: {searchedProductSummary.product.sku}</p>
              )}
            </div>
            <button
              onClick={() => setProductSearch('')}
              className="text-slate-600 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Sold</p>
              <p className="text-2xl font-bold text-slate-800">{searchedProductSummary.totalQuantity}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${searchedProductSummary.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Avg Price</p>
              <p className="text-2xl font-bold text-slate-800">${searchedProductSummary.avgPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-slate-800">{searchedProductSummary.transactionCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
          <button
            onClick={() => setViewMode('summary')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'summary'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Summary
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'detail'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <List className="w-4 h-4" />
            Detail
          </button>
        </div>
      </div>

      {/* Summary View */}
      {viewMode === 'summary' && (
        <div className="space-y-6">
          {/* Top Products Table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Top Products</h3>
              <button
                onClick={handleExportTopProducts}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-600">Loading...</div>
            ) : productSummaries.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No sales data available</div>
            ) : (
              <>
                <div className="overflow-x-auto min-h-[400px] max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Qty Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Avg Price</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedProductSummaries.map((product, idx) => (
                        <tr key={product.productId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">#{productsPage * summaryPageSize + idx + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{product.productName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.category}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-800">{product.totalQuantity}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${product.totalRevenue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-600">${product.avgPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-600">{product.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Page {productsPage + 1} of {productsTotalPages} {productSummaries.length > 0 && `(${productSummaries.length} total)`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProductsPage(prev => Math.max(0, prev - 1))}
                        disabled={productsPage === 0}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(productsTotalPages, 9) }).map((_, i) => {
                        let pageNum = i;
                        if (productsPage > 4 && productsTotalPages > 9) {
                          pageNum = Math.min(productsPage - 4 + i, productsTotalPages - 1);
                        }
                        if (pageNum < 0) pageNum = 0;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setProductsPage(pageNum)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              productsPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setProductsPage(prev => Math.min(productsTotalPages - 1, prev + 1))}
                        disabled={productsPage >= productsTotalPages - 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              </>
            )}
          </div>

          {/* Sales by Category Table */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Sales by Category</h3>
              <button
                onClick={handleExportSalesByCategory}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-600">Loading...</div>
            ) : categorySummaries.length === 0 ? (
              <div className="p-8 text-center text-slate-600">No category data available</div>
            ) : (
              <>
                <div className="overflow-x-auto min-h-[400px] max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Category</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Qty Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Percentage</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedCategorySummaries.map((category) => (
                        <tr key={category.category} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{category.category}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-800">{category.totalQuantity}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${category.totalRevenue.toFixed(2)}</td>
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
                          <td className="px-4 py-3 text-sm text-center text-slate-600">{category.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Page {categoriesPage + 1} of {categoriesTotalPages} {categorySummaries.length > 0 && `(${categorySummaries.length} total)`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCategoriesPage(prev => Math.max(0, prev - 1))}
                        disabled={categoriesPage === 0}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(categoriesTotalPages, 9) }).map((_, i) => {
                        let pageNum = i;
                        if (categoriesPage > 4 && categoriesTotalPages > 9) {
                          pageNum = Math.min(categoriesPage - 4 + i, categoriesTotalPages - 1);
                        }
                        if (pageNum < 0) pageNum = 0;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCategoriesPage(pageNum)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              categoriesPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCategoriesPage(prev => Math.min(categoriesTotalPages - 1, prev + 1))}
                        disabled={categoriesPage >= categoriesTotalPages - 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail View */}
      {viewMode === 'detail' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Transaction Details</h3>
            <button
              onClick={handleExportTransactionDetails}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading...</div>
          ) : salesData.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No sales data found for selected filters</div>
          ) : (
            <>
              <div className="overflow-x-auto min-h-[400px] max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Order #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Cashier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Customer</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Items</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Subtotal</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Discount</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Tax</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {salesData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <div>{row.date}</div>
                          <div className="text-xs text-slate-500">{row.time}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.invoiceId}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.cashier}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {row.customerName ? (
                            <div>
                              <div>{row.customerName}</div>
                              {row.customerPhone && (
                                <div className="text-xs text-slate-500">{row.customerPhone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-800">{row.itemsCount}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-800">${row.subtotal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-yellow-600">${row.discount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">${row.tax.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">${row.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.paymentMethod === 'CASH' 
                              ? 'bg-green-100 text-green-800' 
                              : row.paymentMethod === 'CARD'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.status === 'PAID' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {salesData.length > 0 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(0);
                      }}
                      className="px-2 py-1 border border-slate-300 rounded text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">
                        Page {page + 1} of {totalPages} {totalOrders > 0 && `(${totalOrders} total)`}
                      </span>
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
