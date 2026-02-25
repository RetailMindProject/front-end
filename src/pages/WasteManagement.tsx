import { useState, useEffect, useRef } from 'react';
import { Trash2, ChevronDown, ChevronRight, ChevronLeft, X, AlertTriangle, Package } from 'lucide-react';
import WasteModal from '../components/Operations/WasteModal';
import AuthenticatedImage from '../components/Operations/AuthenticatedImage';
import { storeProductsApi, type StoreProductResponseDTO, type WasteRecordDTO, type ProductBatchDTO } from '../services/store-products.api';
import { productsApi, type ProductDTO } from '../services/products.api';
import PageHeader from "../components/PageHeader";

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
  
  // Summary statistics
  const [wasteStats, setWasteStats] = useState({
    totalWasted: 0,
    totalCost: 0,
    thisMonth: 0,
    topReason: { reason: '', count: 0 }
  });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(StoreProductResponseDTO & { imageUrl?: string | null })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [dateSort, setDateSort] = useState<'latest' | 'oldest'>('latest');
  
  // Store all products for search
  const [allProducts, setAllProducts] = useState<(StoreProductResponseDTO & { imageUrl?: string | null })[]>([]);
  
  // Expanded products (showing batches)
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(new Set());
  const [batchesCache, setBatchesCache] = useState<Map<number, ProductBatchDTO[]>>(new Map());
  const [loadingBatches, setLoadingBatches] = useState<Set<number>>(new Set());
  
  // Debounce timer ref (300ms consistent across all components)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounced search function
  const performSearch = async (searchValue: string) => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // ✅ OPTIMIZED: Use productsApi.filter with search and includeStock
      const searchLower = searchValue.trim().toLowerCase();
      const res = await productsApi.filter({
        page: 0,
        size: 1000, // Get a large number to show all search results
        isActive: true,
        includeStock: true,
        includeCategories: true
      });
      
      if (res.data) {
        let content: ProductDTO[] = [];
        if (typeof res.data === 'object' && 'content' in res.data) {
          content = (res.data as any).content || [];
        } else if (Array.isArray(res.data)) {
          content = res.data;
        }
        
        // Filter by search term and warehouse quantity > 0
        const productsWithInventory = content
          .map((p) => {
            const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
            return {
              ...p,
              warehouseQuantity: warehouseQty,
              storeQuantity: (p as any).storeQuantity ?? (p as any).storeQty ?? 0
            };
          })
          .filter(product => 
            (product.warehouseQuantity || 0) > 0 &&
            (product.name?.toLowerCase().includes(searchLower) ||
             product.sku?.toLowerCase().includes(searchLower) ||
             product.brand?.toLowerCase().includes(searchLower))
          );
        
        // ✅ OPTIMIZED: Data is already in response, no individual API calls needed
        const convertedProducts: (StoreProductResponseDTO & { imageUrl?: string | null })[] = productsWithInventory.map((p) => {
          // Extract image URL
          let imageUrl: string | null | undefined = null;
          if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            const primaryImage = p.images.find(img => img.isPrimary) || p.images[0];
                    if (primaryImage?.url) {
              imageUrl = productsApi.normalizeImageUrl(primaryImage.url, p.id);
            }
          }
          if (!imageUrl && p.primaryImageUrl) {
            imageUrl = productsApi.normalizeImageUrl(p.primaryImageUrl, p.id);
          }
          if (!imageUrl && p.imageUrl) {
            imageUrl = productsApi.normalizeImageUrl(p.imageUrl, p.id);
          }
          
          return {
            productId: typeof p.id === 'string' ? parseInt(p.id) : p.id,
            productName: p.name,
            sku: p.sku,
            brand: p.brand,
            category: Array.isArray(p.categories) && p.categories.length > 0 
              ? p.categories[0].name 
              : (typeof p.category === 'string' ? p.category : undefined),
            price: p.price ?? p.defaultPrice,
            cost: p.cost ?? p.defaultCost,
            warehouseQuantity: p.warehouseQuantity ?? 0,
            warehouseQty: p.warehouseQuantity ?? 0,
            storeQuantity: p.storeQuantity ?? 0,
            storeQty: p.storeQuantity ?? 0,
            imageUrl: imageUrl || p.imageUrl,
            primaryImageUrl: p.primaryImageUrl,
            images: p.images,
            isActive: p.isActive
          };
        });
        
        setSearchResults(convertedProducts);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  };
  
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

  // Fetch all products for search navigation (only when no search term)
  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!searchTerm.trim()) {
        try {
          const allProductsList: (StoreProductResponseDTO & { imageUrl?: string | null })[] = [];
          let currentPage = 0;
          let hasMore = true;
          
          while (hasMore) {
            const res = await storeProductsApi.getProductsWithInventory({
              page: currentPage,
              size: 1000,
              q: undefined
            });
            
            if (res.data) {
              const pageData = res.data as { content: StoreProductResponseDTO[]; totalPages: number };
              const productsWithInventory = pageData.content.filter(product => 
                (product.warehouseQty || product.warehouseQuantity || 0) > 0
              );
              allProductsList.push(...productsWithInventory);
              hasMore = currentPage < pageData.totalPages - 1;
              currentPage++;
            } else {
              hasMore = false;
            }
          }
          
          setAllProducts(allProductsList);
        } catch (err) {
          console.error('Failed to fetch all products for search navigation:', err);
        }
      }
    };
    
    fetchAllProducts();
  }, []); // Only fetch once on mount

  useEffect(() => {
    // Only fetch products if not searching (when searching, we show searchResults directly)
    if (!isSearching) {
      fetchProducts();
    }
    fetchWasteHistory();
  }, [page, itemsPerPage]);

  useEffect(() => {
    setWasteHistoryPage(0); // Reset to first page when filter changes
  }, [reasonFilter, dateSort]);

  useEffect(() => {
    // Reset to page 0 when filters or sort change
    if (reasonFilter || dateSort !== 'latest') {
      setWasteHistoryPage(0);
    }
    fetchWasteHistory();
  }, [wasteHistoryPage, wasteHistoryItemsPerPage, reasonFilter, dateSort]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Calculate statistics from waste history
  useEffect(() => {
    const calculateStats = async () => {
      try {
        // Fetch all waste history records across all pages for accurate stats
        const allRecords: any[] = [];
        let currentPage = 0;
        let hasMore = true;
        let totalElementsFromAPI = 0;
        
        while (hasMore) {
          const res = await storeProductsApi.getWasteHistory({ page: currentPage, size: 1000 });
          if (res.data) {
            const pageData = res.data as { content: any[]; totalPages: number; totalElements: number };
            const records = pageData.content || [];
            allRecords.push(...records);
            
            totalElementsFromAPI = pageData.totalElements || 0;
            hasMore = currentPage < pageData.totalPages - 1;
            currentPage++;
          } else {
            hasMore = false;
          }
        }
        
        // Only calculate stats when we have all records (prevents flickering)
        if (allRecords.length > 0 && (totalElementsFromAPI === 0 || allRecords.length === totalElementsFromAPI || currentPage === 1)) {
          const totalWasted = allRecords.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
          
          const now = new Date();
          const thisMonth = allRecords.filter((r: any) => {
            const date = new Date(r.createdAt || r.wastedAt || r.movedAt || r.created_at);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          }).reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
          
          // Calculate top reason
          const reasonCounts: Record<string, number> = {};
          allRecords.forEach((r: any) => {
            let reason = r.wasteReason || 'UNKNOWN';
            if (reason.includes('Waste Reason: ')) {
              reason = reason.replace('Waste Reason: ', '').trim();
            }
            if (reason.includes('.')) {
              reason = reason.split('.')[0].trim();
            }
            reason = reason.toUpperCase();
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          });
          const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] || ['', 0];
          
          setWasteStats({ 
            totalWasted, 
            totalCost: 0, // TODO: Calculate from product costs if needed
            thisMonth, 
            topReason: { reason: topReason[0], count: topReason[1] } 
          });
          
          // Update total elements if we got it from API
          if (totalElementsFromAPI > 0 && totalElementsFromAPI !== wasteHistoryTotalElements) {
            setWasteHistoryTotalElements(totalElementsFromAPI);
          }
        }
      } catch (err) {
        console.error('Failed to calculate stats:', err);
      }
    };
    
    calculateStats();
  }, []); // Only run once on mount, not when wasteHistory changes

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ OPTIMIZED: Use productsApi.filter with includeStock instead of getProductsWithInventory
      const res = await productsApi.filter({
        page,
        size: itemsPerPage,
        isActive: true, // Only active products
        includeStock: true,        // Request stock quantities in the same call
        includeCategories: true     // Request categories in the same call
      });
      
      if (res.data) {
        // Handle paginated response
        let content: ProductDTO[] = [];
        let totalPagesValue = 0;
        let totalElementsValue = 0;
        
        if (typeof res.data === 'object' && 'content' in res.data) {
          const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number; number: number; size: number };
          content = pageData.content || [];
          totalPagesValue = pageData.totalPages || 0;
          totalElementsValue = pageData.totalElements || 0;
        } else if (Array.isArray(res.data)) {
          content = res.data as ProductDTO[];
          totalPagesValue = 1;
          totalElementsValue = content.length;
        } else {
          content = (res.data as any).content || [];
          totalPagesValue = (res.data as any).totalPages || 0;
          totalElementsValue = (res.data as any).totalElements || 0;
        }
        
        // Filter to only show products with warehouse quantity > 0
        // Check both field name variations
        const productsWithInventory = content
          .map((p) => {
            const warehouseQty = (p as any).warehouseQuantity ?? (p as any).warehouseQty ?? 0;
            return {
              ...p,
              warehouseQuantity: warehouseQty,
              storeQuantity: (p as any).storeQuantity ?? (p as any).storeQty ?? 0
            };
          })
          .filter(product => (product.warehouseQuantity || 0) > 0);
        
        // Apply search filter if provided
        let filteredProducts = productsWithInventory;
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          filteredProducts = productsWithInventory.filter(product =>
            product.name?.toLowerCase().includes(searchLower) ||
            product.sku?.toLowerCase().includes(searchLower) ||
            product.brand?.toLowerCase().includes(searchLower)
          );
        }
        
        // Client-side pagination for filtered results
        const totalFiltered = filteredProducts.length;
          const totalPagesCalculated = Math.ceil(totalFiltered / itemsPerPage);
          
          const startIndex = page * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
          
          setTotalPages(totalPagesCalculated);
          setTotalElements(totalFiltered);
          
        // ✅ OPTIMIZED: Data is already in response, no individual API calls needed
        // Convert to StoreProductResponseDTO format for compatibility
        const convertedProducts: (StoreProductResponseDTO & { imageUrl?: string | null })[] = paginatedProducts.map((p) => {
          // Extract image URL
          let imageUrl: string | null | undefined = null;
          if (p.images && Array.isArray(p.images) && p.images.length > 0) {
            const primaryImage = p.images.find(img => img.isPrimary) || p.images[0];
                    if (primaryImage?.url) {
              imageUrl = productsApi.normalizeImageUrl(primaryImage.url, p.id);
            }
          }
          if (!imageUrl && p.primaryImageUrl) {
            imageUrl = productsApi.normalizeImageUrl(p.primaryImageUrl, p.id);
          }
          if (!imageUrl && p.imageUrl) {
            imageUrl = productsApi.normalizeImageUrl(p.imageUrl, p.id);
          }
          
          return {
            productId: typeof p.id === 'string' ? parseInt(p.id) : p.id,
            productName: p.name,
            sku: p.sku,
            brand: p.brand,
            category: Array.isArray(p.categories) && p.categories.length > 0 
              ? p.categories[0].name 
              : (typeof p.category === 'string' ? p.category : undefined),
            price: p.price ?? p.defaultPrice,
            cost: p.cost ?? p.defaultCost,
            warehouseQuantity: p.warehouseQuantity ?? 0,
            warehouseQty: p.warehouseQuantity ?? 0,
            storeQuantity: p.storeQuantity ?? 0,
            storeQty: p.storeQuantity ?? 0,
            imageUrl: imageUrl || p.imageUrl,
            primaryImageUrl: p.primaryImageUrl,
            images: p.images,
            isActive: p.isActive
          };
        });
        
        setProducts(convertedProducts);
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
      // ✅ OPTIMIZED: Use backend pagination, filtering, and sorting
      const res = await storeProductsApi.getWasteHistory({
        page: wasteHistoryPage,
        size: wasteHistoryItemsPerPage,
        reason: reasonFilter || undefined,
        sortBy: dateSort // ✅ Backend sorting: 'latest' or 'oldest'
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
        
        // ✅ OPTIMIZED: Backend handles filtering and sorting, use backend pagination
        setWasteHistory(normalized);
          setWasteHistoryTotalPages(res.data.totalPages || 0);
        setWasteHistoryTotalElements(res.data.totalElements || normalized.length);
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
      <PageHeader
        title="Waste Management"
        icon={<Trash2 className="h-6 w-6 text-white" />}
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">Total Wasted</p>
                <p className="text-2xl font-bold text-indigo-900">{wasteStats.totalWasted}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">This Month</p>
                <p className="text-2xl font-bold text-green-900">{wasteStats.thisMonth}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border border-red-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Total Records</p>
                <p className="text-2xl font-bold text-red-900">{wasteHistoryTotalElements}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700 mb-1">Top Reason</p>
                <p className={`${wasteStats.topReason.reason === 'OTHER' ? 'text-lg' : 'text-2xl'} font-bold text-yellow-900 capitalize`}>{wasteStats.topReason.reason || 'N/A'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-2xl font-bold text-slate-800">Available Products</h2>
          </div>

          {/* Search Section */}
          <div className="px-6 py-4 border-b bg-slate-50/50 overflow-x-hidden">
            <div className="flex items-center gap-2 flex-nowrap min-h-[40px] w-full min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    
                    // Clear existing timer
                    if (debounceTimerRef.current) {
                      clearTimeout(debounceTimerRef.current);
                    }
                    
                    // Set new timer for debounced search (300ms)
                    debounceTimerRef.current = setTimeout(() => {
                    if (value.trim()) {
                      performSearch(value);
                    } else {
                      setSearchResults([]);
                      setIsSearching(false);
                    }
                    }, 300);
                  }}
                  placeholder="Search product"
                  className="border-solid border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder:text-slate-400 hover:border-slate-400 transition-all duration-200 ease-out px-3 py-2 text-sm flex-1 max-w-md"
                />
                {isSearching && (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setSearchResults([]);
                      setIsSearching(false);
                    }}
                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 flex-shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-3"></div>
              <p className="text-slate-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          ) : (isSearching ? searchResults : products).length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Package className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No products found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(isSearching ? searchResults : products).map((product, idx) => {
                const isExpanded = expandedProducts.has(product.productId);
                const batches = batchesCache.get(product.productId) || [];
                const isLoadingBatches = loadingBatches.has(product.productId);
                const hasBatches = batches.length > 0;
                const qty = product.warehouseQty || product.warehouseQuantity || 0;

                return (
                  <div 
                    key={product.productId} 
                    className="p-5 hover:bg-slate-50 transition-all duration-200 group"
                  >
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
                        <h4 className="text-base font-semibold text-blue-600 mb-1 group-hover:text-blue-700 transition-colors duration-200 truncate">
                          {product.productName || 'Unknown Product'}
                        </h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-sm text-slate-700">
                              {qty} units available
                            </span>
                          </div>
                          {product.productSku && (
                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              SKU: {product.productSku}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {hasBatches && (
                          <button
                            onClick={() => handleShowBatches(product.productId)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all duration-200 flex items-center gap-2 hover:shadow-sm"
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
                      <div className="mt-4 ml-24 space-y-2">
                        {isLoadingBatches ? (
                          <div className="text-sm text-slate-600 flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            Loading batches...
                          </div>
                        ) : batches.length === 0 ? (
                          <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                            No batches available (all wasted)
                          </div>
                        ) : (
                          batches.map((batch) => (
                            <div
                              key={batch.batchId}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Package className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800">
                                    {batch.totalQuantity} units
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    Expires: {new Date(batch.expirationDate).toLocaleDateString()}
                                  </p>
                                </div>
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
        </div>

        {/* Waste History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Waste History
                </h2>
                <p className="text-sm text-slate-600 mt-1">View all recorded waste entries</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-48">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Filter by Reason
                  </label>
                  <select
                    value={reasonFilter}
                    onChange={(e) => {
                      setReasonFilter(e.target.value);
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-all"
                  >
                    <option value="">All Reasons</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="BROKEN">Broken</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="w-48">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Sort by Date
                  </label>
                  <select
                    value={dateSort}
                    onChange={(e) => {
                      setDateSort(e.target.value as 'latest' | 'oldest');
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-all"
                  >
                    <option value="latest">Latest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {loadingHistory ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-3"></div>
              <p className="text-slate-600">Loading history...</p>
            </div>
          ) : wasteHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Trash2 className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No waste records found</p>
              <p className="text-sm text-slate-500 mt-1">Start recording waste to see history here</p>
            </div>
          ) : (
            <>
              <div className="overflow-y-auto min-h-[400px]" style={{ maxHeight: '400px' }}>
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Product</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">SKU</th>
                      <th className="px-5 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Quantity</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Reason</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Batch</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-[100px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wasteHistory.map((record, idx) => {
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
                        <tr 
                          key={record.movementId} 
                          className="hover:bg-slate-50 transition-all duration-150"
                        >
                          <td className="px-5 py-4 text-sm text-slate-700 font-medium">
                            {dateDisplay}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-800">{record.productName}</td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">
                              {record.productSku || '-'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-sm text-slate-700">
                            {record.quantity}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getReasonColor(displayReason)} shadow-sm`}>
                              {displayReason}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {record.batchId ? (
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                                  #{record.batchId}
                                </span>
                                {record.expirationDate && (
                                  <span className="text-xs text-slate-500">
                                    {(() => {
                                      try {
                                        const expDate = new Date(record.expirationDate);
                                        return !isNaN(expDate.getTime()) ? expDate.toLocaleDateString() : 'Invalid';
                                      } catch {
                                        return 'Invalid';
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600 max-w-[100px]">
                            {displayNotes !== '-' ? (
                              <span 
                                className="cursor-pointer hover:bg-slate-100 hover:rounded px-2 py-1 transition-colors truncate inline-block max-w-full text-blue-600 hover:text-blue-700"
                                onClick={() => setNoteModal({ isOpen: true, note: displayNotes })}
                                title="Click to view full note"
                              >
                                {displayNotes.length > 20 ? `${displayNotes.substring(0, 20)}...` : displayNotes}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
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

