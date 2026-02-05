import { useState, useEffect } from 'react';
import { Download, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { storeProductsApi, type WasteRecordDTO } from '../../../services/store-products.api';
import { productsApi } from '../../../services/products.api';

export default function WasteReportTab() {
  const [wasteHistory, setWasteHistory] = useState<WasteRecordDTO[]>([]);
  const [allFilteredRecords, setAllFilteredRecords] = useState<WasteRecordDTO[]>([]); // Store all filtered records for summary
  const [products, setProducts] = useState<any[]>([]); // Store products for cost calculation
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');

  // Summary data
  const [summary, setSummary] = useState({
    totalWasteCost: 0,
    totalQuantity: 0,
    expired: 0,
    broken: 0,
    damaged: 0,
    other: 0,
  });

  // Fetch products on mount for cost calculation
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productsApi.filter({ page: 0, size: 1000 });
        if (res.data) {
          const content = Array.isArray(res.data) ? res.data : res.data.content || [];
          setProducts(content);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchWasteHistory();
  }, [page, pageSize, reasonFilter, dateFrom, dateTo, productSearch]);

  useEffect(() => {
    calculateSummary();
  }, [allFilteredRecords, products]);

  const fetchWasteHistory = async () => {
    setLoading(true);
    try {
      const shouldFetchAll = reasonFilter || dateFrom || dateTo || productSearch.trim();
      console.log('Fetching waste history with params:', {
        page: shouldFetchAll ? 0 : page,
        size: shouldFetchAll ? 1000 : pageSize,
        reason: reasonFilter || undefined,
      });
      
      const res = await storeProductsApi.getWasteHistory({
        page: shouldFetchAll ? 0 : page,
        size: shouldFetchAll ? 1000 : pageSize,
        reason: reasonFilter || undefined,
      });

      console.log('Waste history API response:', res);
      
      if (res.data) {
        const content = res.data.content || [];
        console.log('Waste history data received:', content.length, 'records');
        console.log('First record sample:', content[0]);
        
        if (content.length === 0) {
          console.warn('No waste records found in API response');
          setWasteHistory([]);
          setAllFilteredRecords([]);
          setTotalPages(0);
          setLoading(false);
          return;
        }
        
        // Use the same robust normalization as Waste Management
        const normalized = content.map((record: any) => {
          // Extract waste reason - check both wasteReason field and notes field
          let extractedReason = record.wasteReason || '';
          
          // If wasteReason contains "Waste Reason: ", extract it
          if (extractedReason.includes('Waste Reason: ')) {
            extractedReason = extractedReason.replace('Waste Reason: ', '').trim();
          }
          
          // If wasteReason is empty or still contains the prefix, try to extract from notes
          if (!extractedReason || extractedReason.includes('Waste Reason: ')) {
            if (record.notes && record.notes.includes('Waste Reason: ')) {
              const parts = record.notes.split('Waste Reason: ');
              if (parts.length > 1) {
                extractedReason = parts[1].split('.')[0].trim();
              }
            }
          }
          
          // Clean up the reason
          if (extractedReason.includes('.')) {
            extractedReason = extractedReason.split('.')[0].trim();
          }
          
          // Preserve original notes field - check multiple possible field names
          const originalNotes = record.notes || record.note || record.description || undefined;
          
          return {
            ...record,
            productSku: record.productSku || record.sku || undefined,
            createdAt: record.createdAt || record.wastedAt || record.movedAt || record.created_at,
            wasteReason: extractedReason || record.wasteReason || 'UNKNOWN',
            notes: originalNotes
          };
        });
        
        let filtered = normalized;

        // Apply date filters
        if (dateFrom || dateTo) {
          filtered = filtered.filter((record) => {
            if (!record.createdAt) return false;
            const recordDate = new Date(record.createdAt);
            if (dateFrom && recordDate < new Date(dateFrom)) return false;
            if (dateTo && recordDate > new Date(dateTo + 'T23:59:59')) return false;
            return true;
          });
        }

        // Apply product search
        if (productSearch.trim()) {
          const searchLower = productSearch.toLowerCase().trim();
          filtered = filtered.filter((record) => {
            const nameMatch = record.productName?.toLowerCase().includes(searchLower);
            const skuMatch = record.productSku?.toLowerCase().includes(searchLower);
            const idMatch = String(record.productId).includes(searchLower);
            return nameMatch || skuMatch || idMatch;
          });
        }

        // Apply reason filter (frontend filtering for consistency)
        if (reasonFilter && reasonFilter.trim()) {
          filtered = filtered.filter((record: any) => {
            const reason = (record.wasteReason || '').toUpperCase().trim();
            const filterValue = reasonFilter.toUpperCase().trim();
            return reason === filterValue;
          });
        }

        // Store all filtered records for summary calculation
        setAllFilteredRecords(filtered);
        console.log('Filtered records count:', filtered.length);
        console.log('Sample filtered record:', filtered[0]);

        // Frontend pagination if filtering
        if (shouldFetchAll) {
          const startIndex = page * pageSize;
          const endIndex = startIndex + pageSize;
          const paginated = filtered.slice(startIndex, endIndex);
          console.log('Paginated records:', paginated.length);
          setWasteHistory(paginated);
          setTotalPages(Math.ceil(filtered.length / pageSize));
        } else {
          console.log('Setting waste history (no filter):', filtered.length);
          setWasteHistory(filtered);
          setTotalPages(res.data.totalPages || 0);
        }
      } else {
        console.warn('No data in response:', res);
        setWasteHistory([]);
        setAllFilteredRecords([]);
        setTotalPages(0);
      }
    } catch (err) {
      console.error('Failed to fetch waste history:', err);
      setWasteHistory([]);
      setAllFilteredRecords([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const summaryData = {
      totalWasteCost: 0,
      totalQuantity: 0,
      expired: 0,
      broken: 0,
      damaged: 0,
      other: 0,
    };

    // Create a map of productId to cost for quick lookup
    const productCostMap = new Map<number, number>();
    products.forEach((product) => {
      const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
      if (productId) {
        // Use cost, defaultCost, or price (in that order of preference)
        const cost = product.cost || product.defaultCost || product.price || 0;
        productCostMap.set(productId, cost);
      }
    });

    // Calculate from all filtered records, not just current page
    allFilteredRecords.forEach((record) => {
      summaryData.totalQuantity += record.quantity;
      const reason = (record.wasteReason || '').toUpperCase();
      if (reason === 'EXPIRED') summaryData.expired += record.quantity;
      else if (reason === 'BROKEN') summaryData.broken += record.quantity;
      else if (reason === 'DAMAGED') summaryData.damaged += record.quantity;
      else if (reason === 'OTHER') summaryData.other += record.quantity;
      
      // Calculate waste cost: quantity * product cost
      if (record.productId && productCostMap.has(record.productId)) {
        const productCost = productCostMap.get(record.productId)!;
        summaryData.totalWasteCost += record.quantity * productCost;
      }
    });

    setSummary(summaryData);
  };

  const getReasonColor = (reason: string) => {
    switch (reason.toUpperCase()) {
      case 'EXPIRED': return 'bg-orange-100 text-orange-700';
      case 'BROKEN': return 'bg-red-100 text-red-700';
      case 'DAMAGED': return 'bg-yellow-100 text-yellow-700';
      case 'OTHER': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleExport = async () => {
    // Fetch all products to get SKUs
    let productsMap = new Map<number, string>();
    try {
      const productsRes = await productsApi.filter({ page: 0, size: 1000 });
      if (productsRes.data) {
        const content = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data.content || [];
        content.forEach((product) => {
          const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
          if (productId && product.sku) {
            productsMap.set(productId, product.sku);
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch products for SKU:', err);
    }

    // Helper function to format date consistently (YYYY-MM-DD format for Excel compatibility)
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Format as YYYY-MM-DD for Excel compatibility
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (err) {
        console.error('Error formatting date:', dateString, err);
        return '';
      }
    };

    // Export ALL filtered records, not just current page
    const headers = ['Date', 'Product', 'SKU', 'Quantity', 'Reason', 'Batch ID', 'Expiration Date', 'Notes'];
    const rows = allFilteredRecords.map((record) => {
      const date = formatDate(record.createdAt);
      const notes = record.notes || '';
      // Get SKU from products map or fallback to record.productSku
      const sku = record.productId && productsMap.has(record.productId) 
        ? productsMap.get(record.productId)! 
        : (record.productSku || '');
      return [
        date,
        record.productName || '',
        sku,
        record.quantity,
        record.wasteReason || '',
        record.batchId || '',
        formatDate(record.expirationDate),
        notes.replace(/"/g, '""'), // Escape quotes for CSV
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waste-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setReasonFilter('');
    setProductSearch('');
    setPage(0);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Reasons</option>
              <option value="EXPIRED">Expired</option>
              <option value="BROKEN">Broken</option>
              <option value="DAMAGED">Damaged</option>
              <option value="OTHER">Other</option>
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
              placeholder="Name, SKU, or ID"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Quantity</p>
          <p className="text-2xl font-bold text-slate-800">{summary.totalQuantity}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Expired</p>
          <p className="text-2xl font-bold text-orange-600">{summary.expired}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Broken</p>
          <p className="text-2xl font-bold text-red-600">{summary.broken}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Damaged</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.damaged}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Other</p>
          <p className="text-2xl font-bold text-slate-600">{summary.other}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-slate-800">${summary.totalWasteCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Waste History</h3>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-600">Loading...</div>
        ) : wasteHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-600">No waste records found</div>
        ) : (
          <>
            <div className="overflow-x-auto min-h-[400px] max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {wasteHistory.map((record) => {
                    const date = record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Invalid Date';
                    const reason = (record.wasteReason || 'UNKNOWN').toUpperCase();
                    const notes = record.notes || '';
                    const displayNotes = notes.includes('Waste Reason: ') 
                      ? notes.split('Waste Reason: ')[1]?.split('.')[1]?.trim() || '-'
                      : notes || '-';

                    return (
                      <tr key={record.movementId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-600">{date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.productName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.productSku || '-'}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-800">{record.quantity}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getReasonColor(reason)}`}>
                            {reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {record.batchId ? (
                            <>
                              Batch #{record.batchId}
                              {record.expirationDate && (
                                <span className="text-xs text-slate-500 block">
                                  Exp: {new Date(record.expirationDate).toLocaleDateString()}
                                </span>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[150px] truncate" title={displayNotes}>
                          {displayNotes.length > 30 ? `${displayNotes.substring(0, 30)}...` : displayNotes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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
                    Page {page + 1} of {totalPages} {allFilteredRecords.length > 0 && `(${allFilteredRecords.length} total)`}
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
          </>
        )}
      </div>
    </div>
  );
}

