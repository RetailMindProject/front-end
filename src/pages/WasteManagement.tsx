import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronRight, ChevronLeft, Search, X, AlertTriangle } from 'lucide-react';
import WasteModal from '../components/Operations/WasteModal';
import AuthenticatedImage from '../components/Operations/AuthenticatedImage';
import { storeProductsApi, type StoreProductResponseDTO, type WasteRecordDTO, type ProductBatchDTO } from '../services/store-products.api';
import { productsApi } from '../services/products.api';

export default function WasteManagement() {
  const [products, setProducts] = useState<(StoreProductResponseDTO & { imageUrl?: string | null })[]>([]);
  const [wasteHistory, setWasteHistory] = useState<WasteRecordDTO[]>([]);
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [wasteHistoryPage, setWasteHistoryPage] = useState(0);
  const [wasteHistoryTotalPages, setWasteHistoryTotalPages] = useState(0);
  const [wasteHistoryTotalElements, setWasteHistoryTotalElements] = useState(0);
  const [wasteHistoryItemsPerPage, setWasteHistoryItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [dateSort, setDateSort] = useState<'latest' | 'oldest'>('latest');
  
  // Expanded products (showing batches)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [batchesCache, setBatchesCache] = useState<Map<number, ProductBatchDTO[]>>(new Map());
  const [loadingBatches, setLoadingBatches] = useState<Set<number>>(new Set());
  
  // Waste modal
  const [wasteModal, setWasteModal] = useState<{
    isOpen: boolean;
    productId: number | null;
    batchId?: number | null;
  }>({ isOpen: false, productId: null });
  
  // Note view modal
  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    note: string;
  }>({ isOpen: false, note: '' });
  
  // Batch view modal
  const [batchModal, setBatchModal] = useState<{
    isOpen: boolean;
    batchId: number | null;
    expirationDate: string | null;
    productName: string;
  }>({ isOpen: false, batchId: null, expirationDate: null, productName: '' });

  useEffect(() => {
    fetchProducts();
    fetchWasteHistory();
  }, [page, itemsPerPage, searchTerm]);

  useEffect(() => {
    setWasteHistoryPage(0); // Reset to first page when filter changes
  }, [reasonFilter, dateSort]);

  useEffect(() => {
    fetchWasteHistory();
  }, [wasteHistoryPage, wasteHistoryItemsPerPage, reasonFilter, dateSort]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use getProductsWithInventory to get products with warehouse quantity > 0
      // This gets products available for waste, not products that have been wasted
      const res = await storeProductsApi.getProductsWithInventory({
        page,
        size: itemsPerPage,
        q: searchTerm.trim() || undefined
      });
      
      if (res.data) {
        // Extract pagination info from API response
        const pageData = res.data as { content: StoreProductResponseDTO[]; totalPages: number; totalElements: number; number: number; size: number };
        
        // Filter to only show products with warehouse quantity > 0
        const productsWithInventory = pageData.content.filter(product => 
          (product.warehouseQty || product.warehouseQuantity || 0) > 0
        );
        
        // Debug logging
        console.log('Products API Response Debug:', {
          contentLength: pageData.content?.length,
          totalPages: pageData.totalPages,
          totalElements: pageData.totalElements,
          requestedSize: itemsPerPage,
          actualResponseSize: pageData.size,
          requestedPage: page,
          afterFiltering: productsWithInventory.length,
          filteredOut: pageData.content?.length - productsWithInventory.length,
          productsWithZeroQty: pageData.content?.filter(p => (p.warehouseQty || p.warehouseQuantity || 0) === 0).map(p => ({ id: p.productId, name: p.productName, qty: p.warehouseQty || p.warehouseQuantity }))
        });
        
        // Check if backend paginated correctly
        // If content length > requested size, backend didn't paginate properly
        const backendPaginatedCorrectly = pageData.content.length <= itemsPerPage;
        
        if (!backendPaginatedCorrectly || pageData.totalPages === 0) {
          // Backend didn't paginate properly - do client-side pagination
          const totalFiltered = productsWithInventory.length;
          const totalPagesCalculated = Math.ceil(totalFiltered / itemsPerPage);
          
          // Slice to show only current page
          const startIndex = page * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedProducts = productsWithInventory.slice(startIndex, endIndex);
          
          setTotalPages(totalPagesCalculated);
          setTotalElements(totalFiltered);
          
          // Normalize only the paginated products
          const normalized = await Promise.all(paginatedProducts.map(async (product) => {
          let imageUrl: string | null | undefined = product.imageUrl || product.primaryImageUrl || null;
          let productName: string = product.productName || '';
          
          // If productName is missing or imageUrl is missing, fetch product details
          if (!productName || !imageUrl) {
            try {
              const productRes = await productsApi.getById(product.productId);
              if (productRes.data) {
                // Get product name
                if (!productName && productRes.data.name) {
                  productName = productRes.data.name;
                }
                
                // Try to get image from images array
                if (!imageUrl) {
                  if (productRes.data.images && Array.isArray(productRes.data.images) && productRes.data.images.length > 0) {
                    const primaryImage = productRes.data.images.find((img: any) => img.isPrimary) || productRes.data.images[0];
                    if (primaryImage?.url) {
                      imageUrl = productsApi.normalizeImageUrl(primaryImage.url, product.productId);
                    }
                  } else if (productRes.data.imageUrl || productRes.data.primaryImageUrl) {
                    imageUrl = productsApi.normalizeImageUrl(
                      productRes.data.imageUrl || productRes.data.primaryImageUrl, 
                      product.productId
                    );
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch product details for ${product.productId}:`, err);
            }
          } else {
            // Normalize the existing URL
            imageUrl = productsApi.normalizeImageUrl(imageUrl, product.productId);
          }
          
          return {
            ...product,
            productName: productName || product.productName || 'Unknown Product',
            imageUrl
          };
          }));
          
          setProducts(normalized);
        } else {
          // Backend paginated correctly - use backend's totalPages
          // But recalculate based on filtered results if needed
          const totalFiltered = productsWithInventory.length;
          const totalPagesFromFiltered = Math.ceil((pageData.totalElements || totalFiltered) / itemsPerPage);
          
          setTotalPages(totalPagesFromFiltered > 0 ? totalPagesFromFiltered : 1);
          setTotalElements(pageData.totalElements || totalFiltered);
          
          // Normalize all products from this page
          const normalized = await Promise.all(productsWithInventory.map(async (product) => {
            let imageUrl: string | null | undefined = product.imageUrl || product.primaryImageUrl || null;
            let productName: string = product.productName || '';
            
            // If productName is missing or imageUrl is missing, fetch product details
            if (!productName || !imageUrl) {
              try {
                const productRes = await productsApi.getById(product.productId);
                if (productRes.data) {
                  // Get product name
                  if (!productName && productRes.data.name) {
                    productName = productRes.data.name;
                  }
                  
                  // Try to get image from images array
                  if (!imageUrl) {
                    if (productRes.data.images && Array.isArray(productRes.data.images) && productRes.data.images.length > 0) {
                      const primaryImage = productRes.data.images.find((img: any) => img.isPrimary) || productRes.data.images[0];
                      if (primaryImage?.url) {
                        imageUrl = productsApi.normalizeImageUrl(primaryImage.url, product.productId);
                      }
                    } else if (productRes.data.imageUrl || productRes.data.primaryImageUrl) {
                      imageUrl = productsApi.normalizeImageUrl(
                        productRes.data.imageUrl || productRes.data.primaryImageUrl, 
                        product.productId
                      );
                    }
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch product details for ${product.productId}:`, err);
              }
            } else {
              // Normalize the existing URL
              imageUrl = productsApi.normalizeImageUrl(imageUrl, product.productId);
            }
            
            return {
              ...product,
              productName: productName || product.productName || 'Unknown Product',
              imageUrl
            };
          }));
          
          setProducts(normalized);
        }
      } else {
        setError(res.error || 'Failed to fetch products');
        setTotalPages(0);
        setTotalElements(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchWasteHistory = async () => {
    setLoadingHistory(true);
    try {
      // If filtering or sorting by oldest, fetch all records and paginate on frontend
      // Otherwise, use backend pagination (assuming backend returns latest first by default)
      const shouldFetchAll = (reasonFilter && reasonFilter.trim()) || dateSort === 'oldest';
      const res = await storeProductsApi.getWasteHistory({
        page: shouldFetchAll ? 0 : wasteHistoryPage,
        size: shouldFetchAll ? 1000 : wasteHistoryItemsPerPage, // Use configurable page size
        reason: reasonFilter || undefined
      });
      
      if (res.data) {
        console.log('Waste history fetched:', res.data.content); // Debug log
        // Normalize the data - handle different field names from backend
        const normalized = res.data.content.map((record: any) => {
          // Debug: Log the raw record to see what fields are present
          if (record.wasteReason === 'OTHER' || (record.notes && record.notes.includes('OTHER'))) {
            console.log('OTHER record found:', {
              id: record.id,
              productId: record.productId,
              wasteReason: record.wasteReason,
              notes: record.notes,
              note: record.note,
              allFields: Object.keys(record)
            });
          }
          
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
                // Get the reason part (before the first period)
                extractedReason = parts[1].split('.')[0].trim();
              }
            }
          }
          
          // Clean up the reason - should be just the code (EXPIRED, BROKEN, DAMAGED, OTHER)
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
            // Keep original notes for display - this is important for extracting notes later
            notes: originalNotes
          };
        });
        
        // Apply frontend filtering (backend filtering might not work correctly or reason format might differ)
        let filtered = normalized;
        if (reasonFilter && reasonFilter.trim()) {
          filtered = normalized.filter((record: any) => {
            const reason = (record.wasteReason || '').toUpperCase().trim();
            const filterValue = reasonFilter.toUpperCase().trim();
            return reason === filterValue;
          });
        }
        
        // Apply date sorting (only if we fetched all records or need custom sorting)
        if (shouldFetchAll) {
          filtered = filtered.sort((a: any, b: any) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            
            if (dateSort === 'latest') {
              // Newest first (descending)
              return dateB - dateA;
            } else {
              // Oldest first (ascending)
              return dateA - dateB;
            }
          });
        }
        
        // If filtering or sorting, paginate on frontend
        if (shouldFetchAll) {
          const startIndex = wasteHistoryPage * wasteHistoryItemsPerPage;
          const endIndex = startIndex + wasteHistoryItemsPerPage;
          const paginatedFiltered = filtered.slice(startIndex, endIndex);
          const totalFilteredPages = Math.ceil(filtered.length / wasteHistoryItemsPerPage);
          
          setWasteHistory(paginatedFiltered);
          setWasteHistoryTotalPages(totalFilteredPages);
          setWasteHistoryTotalElements(filtered.length);
        } else {
          // No filter, use backend pagination (assumes backend returns latest first)
          setWasteHistory(filtered);
          setWasteHistoryTotalPages(res.data.totalPages || 0);
          setWasteHistoryTotalElements(res.data.totalElements || filtered.length);
        }
      } else {
        console.error('Failed to fetch waste history:', res.error);
      }
    } catch (err) {
      console.error('Failed to fetch waste history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadBatchesForProduct = async (productId: number) => {
    if (batchesCache.has(productId)) {
      setExpandedProducts(prev => new Set(prev).add(productId));
      return;
    }

    setLoadingBatches(prev => new Set(prev).add(productId));
    try {
      const res = await storeProductsApi.getBatchesForProduct(productId);
      if (res.data) {
        // Filter to show only batches with quantity > 0
        const availableBatches = res.data.filter(batch => batch.totalQuantity > 0);
        setBatchesCache(prev => new Map(prev).set(productId, availableBatches));
        setExpandedProducts(prev => new Set(prev).add(productId));
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoadingBatches(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const handleShowBatches = (productId: number) => {
    if (expandedProducts.has(productId)) {
      setExpandedProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } else {
      loadBatchesForProduct(productId);
    }
  };

  const handleRecordWaste = (productId: number, batchId?: number) => {
    setWasteModal({ isOpen: true, productId, batchId });
  };

  const handleWasteSuccess = async () => {
    // Refresh products list
    await fetchProducts();
    // Refresh waste history immediately
    await fetchWasteHistory();
    // Clear expanded state and cache for the affected product
    if (wasteModal.productId) {
      setExpandedProducts(prev => {
        const next = new Set(prev);
        next.delete(wasteModal.productId!);
        return next;
      });
      setBatchesCache(prev => {
        const next = new Map(prev);
        next.delete(wasteModal.productId!);
        return next;
      });
    }
  };

  const handleWasteHistoryPageChange = (newPage: number) => {
    setWasteHistoryPage(newPage);
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'EXPIRED': return 'bg-orange-100 text-orange-700';
      case 'BROKEN': return 'bg-red-100 text-red-700';
      case 'DAMAGED': return 'bg-yellow-100 text-yellow-700';
      case 'OTHER': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="border-b border-indigo-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-orange-600 shadow-lg ring-2 ring-white/20">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Waste Management
              </h1>
              <p className="text-sm text-slate-600 mt-1">Record and track product waste</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Product
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search product"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Products</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-600">Loading products...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No products found</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {products.map((product) => {
                const isExpanded = expandedProducts.has(product.productId);
                const batches = batchesCache.get(product.productId) || [];
                const isLoadingBatches = loadingBatches.has(product.productId);
                const hasBatches = batches.length > 0;

                return (
                  <div key={product.productId} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 bg-white border border-slate-200 rounded-lg p-2">
                        {product.imageUrl ? (
                          <AuthenticatedImage
                            src={product.imageUrl}
                            alt={product.productName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="text-xs">No Image</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {product.productName || 'Unknown Product'}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Available: {product.warehouseQty || product.warehouseQuantity || 0} units
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {hasBatches && (
                          <button
                            onClick={() => handleShowBatches(product.productId)}
                            className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Hide Batches
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-4 h-4" />
                                Show Batches
                              </>
                            )}
                          </button>
                        )}
                          <button
                            onClick={() => handleRecordWaste(product.productId)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center"
                            title="Waste"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                      </div>
                    </div>

                    {/* Expanded Batches */}
                    {isExpanded && (
                      <div className="mt-4 ml-20 space-y-2">
                        {isLoadingBatches ? (
                          <div className="text-sm text-slate-600">Loading batches...</div>
                        ) : batches.length === 0 ? (
                          <div className="text-sm text-slate-600">No batches available (all wasted)</div>
                        ) : (
                          batches.map((batch) => (
                            <div
                              key={batch.batchId}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {batch.totalQuantity} units
                                </p>
                                <p className="text-xs text-slate-600">
                                  Expiration: {new Date(batch.expirationDate).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRecordWaste(product.productId, batch.batchId)}
                                className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center"
                                title="Waste"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setItemsPerPage(newSize);
                    setPage(0);
                  }}
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  Page {page + 1} of {totalPages} {totalElements > 0 && `(${totalElements} total)`}
                </span>
                <div className="inline-flex rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
                  <button
                    onClick={() => setPage(prev => Math.max(0, prev - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 border-l border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Waste History */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Waste History</h2>
              <div className="flex items-end gap-3">
                <div className="w-48">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Filter by Reason
                  </label>
                  <select
                    value={reasonFilter}
                    onChange={(e) => {
                      setReasonFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Reasons</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="BROKEN">Broken</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sort by Date
                  </label>
                  <select
                    value={dateSort}
                    onChange={(e) => {
                      setDateSort(e.target.value as 'latest' | 'oldest');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="latest">Latest</option>
                    <option value="oldest">Earliest</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {loadingHistory ? (
            <div className="p-8 text-center text-slate-600">Loading history...</div>
          ) : wasteHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-600">No waste records found</div>
          ) : (
            <>
              <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">SKU</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-700 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase w-[100px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {wasteHistory.map((record) => {
                      // Parse date safely
                      let dateDisplay = 'Invalid Date';
                      try {
                        if (record.createdAt) {
                          const date = new Date(record.createdAt);
                          if (!isNaN(date.getTime())) {
                            dateDisplay = date.toLocaleDateString();
                          }
                        }
                      } catch (e) {
                        console.error('Date parsing error:', e, record.createdAt);
                      }

                      // Extract waste reason - should be just the reason (EXPIRED, BROKEN, DAMAGED, OTHER)
                      let displayReason = record.wasteReason || 'UNKNOWN';
                      if (displayReason.includes('Waste Reason: ')) {
                        displayReason = displayReason.replace('Waste Reason: ', '').trim() as 'EXPIRED' | 'BROKEN' | 'DAMAGED' | 'OTHER';
                      }
                      // Ensure it's just the reason code, not the full text
                      if (displayReason.includes('.')) {
                        displayReason = displayReason.split('.')[0].trim() as 'EXPIRED' | 'BROKEN' | 'DAMAGED' | 'OTHER';
                      }

                      // Extract notes - everything after "Waste Reason: [REASON]."
                      let displayNotes = '-';
                      if (record.notes) {
                        const notesStr = String(record.notes);
                        
                        // Check if notes contain "Waste Reason: "
                        if (notesStr.includes('Waste Reason: ')) {
                          const parts = notesStr.split('Waste Reason: ');
                          if (parts.length > 1) {
                            // Get everything after "Waste Reason: "
                            const afterReason = parts[1].trim();
                            
                            // Find the first period after the reason
                            // Format: "OTHER. bla bla" -> reason: "OTHER", notes: "bla bla"
                            const firstPeriodIndex = afterReason.indexOf('.');
                            
                            if (firstPeriodIndex > 0) {
                              // Get everything after the first period (including the space)
                              // Format: "OTHER. bla bla" -> substring(6) = " bla bla" -> trim() = "bla bla"
                              const notesPart = afterReason.substring(firstPeriodIndex + 1).trim();
                              // Only show notes if there's actual content (not just whitespace)
                              displayNotes = notesPart.length > 0 ? notesPart : '-';
                            } else {
                              // If there's no period after the reason, no additional notes
                              displayNotes = '-';
                            }
                          }
                        } else {
                          // If no "Waste Reason: " prefix, use notes as-is
                          displayNotes = notesStr.trim() || '-';
                        }
                      }

                      return (
                        <tr key={record.movementId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {dateDisplay}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.productName}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{record.productSku || '-'}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-800">{record.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getReasonColor(displayReason)}`}>
                              {displayReason}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {record.batchId ? (
                              <span>
                                Batch #{record.batchId}
                                {record.expirationDate && (
                                  <span className="text-xs text-slate-500 block">
                                    Exp: {(() => {
                                      try {
                                        const expDate = new Date(record.expirationDate);
                                        return !isNaN(expDate.getTime()) ? expDate.toLocaleDateString() : 'Invalid Date';
                                      } catch {
                                        return 'Invalid Date';
                                      }
                                    })()}
                                  </span>
                                )}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-[100px]">
                            {displayNotes !== '-' ? (
                              <span 
                                className="cursor-pointer hover:bg-slate-100 hover:rounded px-1 py-0.5 transition-colors truncate inline-block max-w-full"
                                onClick={() => setNoteModal({ isOpen: true, note: displayNotes })}
                                title="Click to view full note"
                              >
                                {displayNotes.length > 20 ? `${displayNotes.substring(0, 20)}...` : displayNotes}
                              </span>
                            ) : (
                              <span className="block truncate">{displayNotes}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {wasteHistoryTotalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Rows per page:</span>
                    <select
                      value={wasteHistoryItemsPerPage}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setWasteHistoryItemsPerPage(newSize);
                        setWasteHistoryPage(0);
                      }}
                      className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      Page {wasteHistoryPage + 1} of {wasteHistoryTotalPages} {wasteHistoryTotalElements > 0 && `(${wasteHistoryTotalElements} total)`}
                    </span>
                    <div className="inline-flex rounded-lg overflow-hidden border border-slate-300 bg-white shadow-sm">
                      <button
                        onClick={() => handleWasteHistoryPageChange(Math.max(0, wasteHistoryPage - 1))}
                        disabled={wasteHistoryPage === 0}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleWasteHistoryPageChange(Math.min(wasteHistoryTotalPages - 1, wasteHistoryPage + 1))}
                        disabled={wasteHistoryPage >= wasteHistoryTotalPages - 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-150 border-l border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Waste Modal */}
      <WasteModal
        isOpen={wasteModal.isOpen}
        productId={wasteModal.productId}
        batchId={wasteModal.batchId}
        onSuccess={handleWasteSuccess}
        onClose={() => setWasteModal({ isOpen: false, productId: null })}
      />
      
      {/* Note View Modal */}
      {noteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">Full Note</h2>
              <button
                onClick={() => setNoteModal({ isOpen: false, note: '' })}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
                {noteModal.note}
              </p>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setNoteModal({ isOpen: false, note: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch View Modal */}
      {batchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Batch Details</h2>
              <button
                onClick={() => setBatchModal({ isOpen: false, batchId: null, expirationDate: null, productName: '' })}
                className="p-1 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Product</p>
                <p className="text-sm text-slate-800">{batchModal.productName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Batch ID</p>
                <p className="text-sm text-slate-800">#{batchModal.batchId}</p>
              </div>
              {batchModal.expirationDate && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Expiration Date</p>
                  <p className="text-sm text-slate-800">{batchModal.expirationDate}</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setBatchModal({ isOpen: false, batchId: null, expirationDate: null, productName: '' })}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

