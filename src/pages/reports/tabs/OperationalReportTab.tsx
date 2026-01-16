import { useState, useEffect, useMemo } from 'react';
import { Download, Filter, X, ArrowRightLeft, Package, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardApi, type RecentMovement } from '../../../services/dashboard.api';
import { sessionsApi, type SessionListItem } from '../../../services/sessions.api';
import { productsApi } from '../../../services/products.api';

interface TransferRecord {
  date: string;
  productName: string;
  sku?: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  user?: string;
  notes?: string;
}

interface RestockingRecord {
  date: string;
  productName: string;
  sku?: string;
  quantity: number;
  expirationDate?: string | null;
  batchId?: number | null;
  user?: string;
}

interface CashierPerformance {
  cashierName: string;
  totalSales: number;
  orders: number;
  avgOrderValue: number;
  cashIn: number;
  cardIn: number;
  transactions: number;
}

interface ActivityRecord {
  date: string;
  time: string;
  type: string;
  productName: string;
  quantity: number;
  user?: string;
  details: string;
}

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ActivityType = 'all' | 'transfer' | 'restock' | 'waste' | 'sale';

export default function OperationalReportTab() {
  const [loading, setLoading] = useState(false);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Section-specific filters
  const [transferProductSearch, setTransferProductSearch] = useState<string>('');
  const [restockProductSearch, setRestockProductSearch] = useState<string>('');
  const [cashierSearch, setCashierSearch] = useState<string>('');
  const [activityType, setActivityType] = useState<ActivityType>('all');
  const [activityProductSearch, setActivityProductSearch] = useState<string>('');

  // Pagination
  const [transferPage, setTransferPage] = useState(0);
  const [restockPage, setRestockPage] = useState(0);
  const [cashierPage, setCashierPage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const pageSize = 10;

  // Data
  const [movements, setMovements] = useState<RecentMovement[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);

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

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getDateRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch movements (for transfers, restocking, activity timeline)
      const movementsData = await dashboardApi.fetchRecentMovements();
      if (movementsData) {
        setMovements(movementsData);
      }

      // Fetch sessions (for cashier performance)
      const sessionsData = await sessionsApi.fetchSessions({
        date: dateFrom || undefined,
        status: 'ALL',
      });
      if (sessionsData) {
        setSessions(sessionsData);
      }

      // Fetch products for SKU lookup
      const productsRes = await productsApi.filter({ page: 0, size: 1000 });
      if (productsRes.data) {
        const content = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.content || [];
        setProducts(content);
      }
    } catch (err) {
      console.error('Failed to fetch operational data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get product SKU by name
  const getProductSku = (productName: string): string | undefined => {
    const product = products.find(p => p.name === productName);
    return product?.sku;
  };

  // Filter movements by date range
  const filterMovementsByDate = (movementsList: RecentMovement[]): RecentMovement[] => {
    if (!dateFrom || !dateTo) return movementsList;
    
    return movementsList.filter(movement => {
      const movementDate = new Date(movement.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      
      return movementDate >= fromDate && movementDate <= toDate;
    });
  };

  // Transfer Records (movements between locations)
  const transferRecords = useMemo(() => {
    const filtered = filterMovementsByDate(movements).filter(m => {
      // Transfers are movements that change location (WAREHOUSE ↔ STORE)
      // We'll identify them by locationType changes or specific refTypes
      return m.locationType && (m.refType === 'PURCHASE' || m.quantityChange !== 0);
    });

    const records: TransferRecord[] = filtered.map(m => {
      // Determine transfer direction based on quantity change and location
      const isToStore = m.locationType === 'STORE' && m.quantityChange > 0;
      const isToWarehouse = m.locationType === 'WAREHOUSE' && m.quantityChange > 0;
      
      return {
        date: m.date,
        productName: m.productName,
        sku: getProductSku(m.productName),
        fromLocation: isToStore ? 'Warehouse' : 'Store',
        toLocation: isToStore ? 'Store' : 'Warehouse',
        quantity: Math.abs(m.quantityChange),
        user: undefined, // API doesn't provide user info
        notes: `${m.refType} - ${m.categoryName}`,
      };
    });

    // Filter by product search
    if (transferProductSearch.trim()) {
      const searchLower = transferProductSearch.toLowerCase().trim();
      return records.filter(r => 
        r.productName.toLowerCase().includes(searchLower) ||
        r.sku?.toLowerCase().includes(searchLower)
      );
    }

    return records;
  }, [movements, dateFrom, dateTo, transferProductSearch, products]);

  // Paginated transfer records
  const paginatedTransfers = useMemo(() => {
    const startIndex = transferPage * pageSize;
    return transferRecords.slice(startIndex, startIndex + pageSize);
  }, [transferRecords, transferPage]);
  const transferTotalPages = Math.ceil(transferRecords.length / pageSize);

  // Restocking Records (PURCHASE type movements to warehouse)
  const restockingRecords = useMemo(() => {
    const filtered = filterMovementsByDate(movements).filter(m => 
      m.refType === 'PURCHASE' && m.locationType === 'WAREHOUSE' && m.quantityChange > 0
    );

    const records: RestockingRecord[] = filtered.map(m => ({
      date: m.date,
      productName: m.productName,
      sku: getProductSku(m.productName),
      quantity: m.quantityChange,
      expirationDate: undefined, // API doesn't provide this
      batchId: undefined,
      user: undefined,
    }));

    // Filter by product search
    if (restockProductSearch.trim()) {
      const searchLower = restockProductSearch.toLowerCase().trim();
      return records.filter(r => 
        r.productName.toLowerCase().includes(searchLower) ||
        r.sku?.toLowerCase().includes(searchLower)
      );
    }

    return records;
  }, [movements, dateFrom, dateTo, restockProductSearch, products]);

  // Paginated restocking records
  const paginatedRestocks = useMemo(() => {
    const startIndex = restockPage * pageSize;
    return restockingRecords.slice(startIndex, startIndex + pageSize);
  }, [restockingRecords, restockPage]);
  const restockTotalPages = Math.ceil(restockingRecords.length / pageSize);

  // Cashier Performance
  const cashierPerformance = useMemo(() => {
    // Filter sessions by date if provided
    let filteredSessions = sessions;
    if (dateFrom && dateTo) {
      filteredSessions = sessions.filter(s => {
        if (!s.openedAt) return false;
        const sessionDate = new Date(s.openedAt).toISOString().split('T')[0];
        return sessionDate >= dateFrom && sessionDate <= dateTo;
      });
    }

    // Group by cashier and aggregate
    const cashierMap = new Map<string, CashierPerformance>();
    
    filteredSessions.forEach(session => {
      const cashierName = `${session.firstName} ${session.lastName}`;
      const existing = cashierMap.get(cashierName);
      
      if (existing) {
        existing.totalSales += session.totalSales || 0;
        existing.orders += session.ordersCount || 0;
        existing.transactions += session.ordersCount || 0;
        existing.avgOrderValue = existing.orders > 0 ? existing.totalSales / existing.orders : 0;
        // Note: API doesn't provide cash/card split, so we'll leave them as 0
      } else {
        cashierMap.set(cashierName, {
          cashierName,
          totalSales: session.totalSales || 0,
          orders: session.ordersCount || 0,
          avgOrderValue: session.ordersCount > 0 ? (session.totalSales || 0) / session.ordersCount : 0,
          cashIn: 0, // API doesn't provide this
          cardIn: 0, // API doesn't provide this
          transactions: session.ordersCount || 0,
        });
      }
    });

    let result = Array.from(cashierMap.values()).sort((a, b) => b.totalSales - a.totalSales);

    // Filter by cashier search
    if (cashierSearch.trim()) {
      const searchLower = cashierSearch.toLowerCase().trim();
      result = result.filter(c => c.cashierName.toLowerCase().includes(searchLower));
    }

    return result;
  }, [sessions, dateFrom, dateTo, cashierSearch]);

  // Paginated cashier performance
  const paginatedCashiers = useMemo(() => {
    const startIndex = cashierPage * pageSize;
    return cashierPerformance.slice(startIndex, startIndex + pageSize);
  }, [cashierPerformance, cashierPage]);
  const cashierTotalPages = Math.ceil(cashierPerformance.length / pageSize);

  // Activity Timeline
  const activityRecords = useMemo(() => {
    const filtered = filterMovementsByDate(movements);

    const records: ActivityRecord[] = filtered.map(m => {
      let type = 'Unknown';
      if (m.refType === 'SALE') type = 'Sale';
      else if (m.refType === 'PURCHASE' && m.locationType === 'WAREHOUSE') type = 'Restock';
      else if (m.locationType) type = 'Transfer';
      
      return {
        date: m.date,
        time: new Date(m.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type,
        productName: m.productName,
        quantity: Math.abs(m.quantityChange),
        user: undefined,
        details: `${m.refType} - ${m.categoryName} - ${m.locationType}`,
      };
    });

    // Filter by activity type
    let filteredByType = records;
    if (activityType !== 'all') {
      filteredByType = records.filter(r => {
        const typeLower = r.type.toLowerCase();
        return typeLower === activityType.toLowerCase();
      });
    }

    // Filter by product search
    if (activityProductSearch.trim()) {
      const searchLower = activityProductSearch.toLowerCase().trim();
      filteredByType = filteredByType.filter(r => 
        r.productName.toLowerCase().includes(searchLower) ||
        getProductSku(r.productName)?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    return filteredByType.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }, [movements, dateFrom, dateTo, activityType, activityProductSearch, products]);

  // Paginated activity records
  const paginatedActivities = useMemo(() => {
    const startIndex = activityPage * pageSize;
    return activityRecords.slice(startIndex, startIndex + pageSize);
  }, [activityRecords, activityPage]);
  const activityTotalPages = Math.ceil(activityRecords.length / pageSize);

  // Export functions
  const handleExportTransfers = () => {
    const headers = ['Date', 'Product', 'SKU', 'From Location', 'To Location', 'Quantity', 'Notes'];
    const rows = transferRecords.map(r => [
      r.date,
      r.productName,
      r.sku || '',
      r.fromLocation,
      r.toLocation,
      r.quantity,
      r.notes || '',
    ]);
    exportCSV(headers, rows, `transfer-reports-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportRestocks = () => {
    const headers = ['Date', 'Product', 'SKU', 'Quantity', 'Expiration Date', 'Batch ID'];
    const rows = restockingRecords.map(r => [
      r.date,
      r.productName,
      r.sku || '',
      r.quantity,
      r.expirationDate || '',
      r.batchId?.toString() || '',
    ]);
    exportCSV(headers, rows, `restocking-reports-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportCashiers = () => {
    const headers = ['Cashier Name', 'Total Sales', 'Orders', 'Avg Order Value', 'Cash', 'Card', 'Transactions'];
    const rows = cashierPerformance.map(c => [
      c.cashierName,
      c.totalSales.toFixed(2),
      c.orders,
      c.avgOrderValue.toFixed(2),
      c.cashIn.toFixed(2),
      c.cardIn.toFixed(2),
      c.transactions,
    ]);
    exportCSV(headers, rows, `cashier-performance-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportActivity = () => {
    const headers = ['Date', 'Time', 'Type', 'Product', 'SKU', 'Quantity', 'Details'];
    const rows = activityRecords.map(r => [
      r.date,
      r.time,
      r.type,
      r.productName,
      getProductSku(r.productName) || '',
      r.quantity,
      r.details,
    ]);
    exportCSV(headers, rows, `activity-timeline-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setDatePreset('month');
    setTransferProductSearch('');
    setRestockProductSearch('');
    setCashierSearch('');
    setActivityType('all');
    setActivityProductSearch('');
    setTransferPage(0);
    setRestockPage(0);
    setCashierPage(0);
    setActivityPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Global Filters */}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {datePreset === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transfer Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-800">Transfer Reports</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={transferProductSearch}
              onChange={(e) => {
                setTransferProductSearch(e.target.value);
                setTransferPage(0);
              }}
              placeholder="Search product..."
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleExportTransfers}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading transfer data...</div>
        ) : transferRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No transfer records found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">To</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedTransfers.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{record.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.fromLocation}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.toLocation}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{record.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transferTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {transferPage + 1} of {transferTotalPages} {transferRecords.length > 0 && `(${transferRecords.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTransferPage(prev => Math.max(0, prev - 1))}
                    disabled={transferPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(transferTotalPages, 9) }).map((_, i) => {
                    const pageNum = Math.min(i, transferTotalPages - 1);
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setTransferPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          transferPage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setTransferPage(prev => Math.min(transferTotalPages - 1, prev + 1))}
                    disabled={transferPage >= transferTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Restocking Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-800">Restocking Reports</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={restockProductSearch}
              onChange={(e) => {
                setRestockProductSearch(e.target.value);
                setRestockPage(0);
              }}
              placeholder="Search product..."
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleExportRestocks}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading restocking data...</div>
        ) : restockingRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No restocking records found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Expiration Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Batch ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedRestocks.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{record.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.sku || '-'}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{record.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.expirationDate || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.batchId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {restockTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {restockPage + 1} of {restockTotalPages} {restockingRecords.length > 0 && `(${restockingRecords.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRestockPage(prev => Math.max(0, prev - 1))}
                    disabled={restockPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(restockTotalPages, 9) }).map((_, i) => {
                    const pageNum = Math.min(i, restockTotalPages - 1);
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setRestockPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          restockPage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setRestockPage(prev => Math.min(restockTotalPages - 1, prev + 1))}
                    disabled={restockPage >= restockTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cashier Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-800">Cashier Performance</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={cashierSearch}
              onChange={(e) => {
                setCashierSearch(e.target.value);
                setCashierPage(0);
              }}
              placeholder="Search cashier..."
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleExportCashiers}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading cashier data...</div>
        ) : cashierPerformance.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No cashier performance data found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Cashier Name</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Total Sales</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Avg Order Value</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Cash</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase">Card</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedCashiers.map((cashier, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{cashier.cashierName}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">${cashier.totalSales.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{cashier.orders}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${cashier.avgOrderValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${cashier.cashIn.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">${cashier.cardIn.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{cashier.transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cashierTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {cashierPage + 1} of {cashierTotalPages} {cashierPerformance.length > 0 && `(${cashierPerformance.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCashierPage(prev => Math.max(0, prev - 1))}
                    disabled={cashierPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(cashierTotalPages, 9) }).map((_, i) => {
                    const pageNum = Math.min(i, cashierTotalPages - 1);
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCashierPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          cashierPage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCashierPage(prev => Math.min(cashierTotalPages - 1, prev + 1))}
                    disabled={cashierPage >= cashierTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-slate-800">Activity Timeline</h3>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value as ActivityType);
                setActivityPage(0);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">All Activities</option>
              <option value="transfer">Transfers</option>
              <option value="restock">Restocking</option>
              <option value="waste">Waste</option>
              <option value="sale">Sales</option>
            </select>
            <input
              type="text"
              value={activityProductSearch}
              onChange={(e) => {
                setActivityProductSearch(e.target.value);
                setActivityPage(0);
              }}
              placeholder="Search product..."
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleExportActivity}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading activity data...</div>
        ) : activityRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No activity records found</div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedActivities.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{record.date}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.time}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          record.type === 'Sale' ? 'bg-green-100 text-green-800' :
                          record.type === 'Restock' ? 'bg-blue-100 text-blue-800' :
                          record.type === 'Transfer' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.productName}</td>
                      <td className="px-4 py-3 text-sm text-center text-slate-800">{record.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{record.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activityTotalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {activityPage + 1} of {activityTotalPages} {activityRecords.length > 0 && `(${activityRecords.length} total)`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivityPage(prev => Math.max(0, prev - 1))}
                    disabled={activityPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(activityTotalPages, 9) }).map((_, i) => {
                    const pageNum = Math.min(i, activityTotalPages - 1);
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setActivityPage(pageNum)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                          activityPage === pageNum ? 'bg-blue-600 text-white' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setActivityPage(prev => Math.min(activityTotalPages - 1, prev + 1))}
                    disabled={activityPage >= activityTotalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
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
