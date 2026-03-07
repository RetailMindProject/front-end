import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { SearchParams, SearchResponse, ProductCard } from "../types/customer.search";
import { customerBrowseApi } from "../services/customer.browse.api";
import { clearAllTokens } from "../services/tokens";
import { normalizeProductImageUrl } from "../utils/imageUrl";

interface UseProductSearchReturn {
  // State
  items: ProductCard[];
  total: number;
  totalPages: number;
  currentPage: number;
  loading: boolean;
  error: string | null;
  params: SearchParams;
  
  // Actions
  setQuery: (q: string) => void;
  setCategory: (categoryId: number | undefined) => void;
  setSubCategory: (subCategoryId: number | undefined) => void;
  setFilter: (key: keyof SearchParams, value: any) => void;
  setPage: (page: number) => void;
  loadMore: () => void;
  resetFilters: () => void;
  hasMore: boolean;
}

const DEFAULT_SIZE = 20;

export function useProductSearch(): UseProductSearchReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // Backend uses 0-based pages
  const debounceTimerRef = useRef<number | null>(null);

  // Parse URL params to SearchParams
  const parseParams = useCallback((): SearchParams => {
    return {
      q: searchParams.get("q") || undefined,
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      subCategoryId: searchParams.get("subCategoryId") ? Number(searchParams.get("subCategoryId")) : undefined,
      offersOnly: searchParams.get("offersOnly") === "true",
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      sortKey: (searchParams.get("sortKey") as SearchParams["sortKey"]) || "RELEVANCE",
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 0, // Backend uses 0-based
      size: DEFAULT_SIZE,
    };
  }, [searchParams]);

  const params = parseParams();

  // Update URL params
  const updateUrlParams = useCallback((updates: Partial<SearchParams>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    // Reset page when filters change (except when explicitly setting page)
    if (!updates.page) {
      newParams.delete("page");
    }

    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Perform search
  const performSearch = useCallback(async (searchParams: SearchParams, append = false) => {
    // Determine if we should show products
    // Show products if: category/subcategory selected OR search query provided
    const shouldShowProducts = 
      (searchParams.categoryId !== undefined) || 
      (searchParams.subCategoryId !== undefined) || 
      (searchParams.q !== undefined && searchParams.q.trim() !== "");

    if (!shouldShowProducts) {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use categoryId (can be root category or subcategory)
      const categoryId = searchParams.subCategoryId || searchParams.categoryId;
      
      const response = await customerBrowseApi.getProducts({
        page: searchParams.page ?? 0,
        size: searchParams.size ?? DEFAULT_SIZE,
        categoryId: categoryId,
        q: searchParams.q,
        offersOnly: searchParams.offersOnly,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        sortKey: searchParams.sortKey || "RELEVANCE",
      });
      
      if (response.status === 401 || response.status === 403) {
        // Session expired - clear tokens and redirect
        clearAllTokens();
        navigate("/login");
        return;
      }
      
      if (response.status === 400) {
        // Validation error (minPrice > maxPrice, invalid sortKey)
        setError(response.error || "Invalid filter parameters");
        // Keep previous results if available
        if (items.length === 0) {
          setItems([]);
          setTotal(0);
          setTotalPages(0);
        }
        return;
      }
      
      if (response.error) {
        setError(response.error);
        setItems([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }
      
      if (response.data) {
        // Transform backend response to ProductCard format
        const transformedItems: ProductCard[] = response.data.content.map((item) => {
          // Normalize image URL for frontend display (from public/picture/)
          const imageUrl = normalizeProductImageUrl(item.primaryImageUrl);
          
          return {
            id: item.id,
            sku: item.sku,
            name: item.name,
            brand: item.brand,
            defaultPrice: item.defaultPrice,
            taxRate: item.taxRate,
            primaryImageUrl: imageUrl,
            offer: item.offer,
            // Legacy fields for backward compatibility
            price: item.defaultPrice,
            imageUrl: imageUrl || undefined,
            hasOffer: item.offer !== null,
          };
        });
        
        if (append) {
          setItems((prev) => [...prev, ...transformedItems]);
        } else {
          setItems(transformedItems);
        }
        
        setTotal(response.data.totalElements);
        setTotalPages(response.data.totalPages);
        setCurrentPage(response.data.page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search products");
      setItems([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Debounced search (400ms delay)
  const debouncedSearch = useCallback((searchParams: SearchParams) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      performSearch(searchParams, false);
    }, 400);
  }, [performSearch]);

  // Initial load and when params change
  useEffect(() => {
    const currentParams = parseParams();
    
    // Determine if we should show products
    // Show products if: category/subcategory selected OR search query provided
    const shouldShowProducts = 
      (currentParams.categoryId !== undefined) || 
      (currentParams.subCategoryId !== undefined) || 
      (currentParams.q !== undefined && currentParams.q.trim() !== "");

    if (!shouldShowProducts) {
      setItems([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }
    
    // If query exists, use debounced search
    if (currentParams.q && currentParams.q.trim()) {
      debouncedSearch({ ...currentParams, page: 0 });
    } else {
      // Immediate search for category/subcategory
      performSearch({ ...currentParams, page: 0 }, false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchParams, parseParams, debouncedSearch, performSearch]);

  // Actions
  const setQuery = useCallback((q: string) => {
    updateUrlParams({ q, page: 0 });
  }, [updateUrlParams]);

  const setCategory = useCallback((categoryId: number | undefined) => {
    updateUrlParams({ 
      categoryId, 
      subCategoryId: undefined, // Reset subcategory when category changes
      page: 0 
    });
  }, [updateUrlParams]);

  const setSubCategory = useCallback((subCategoryId: number | undefined) => {
    updateUrlParams({ subCategoryId, page: 0 });
  }, [updateUrlParams]);

  const setFilter = useCallback((key: keyof SearchParams, value: any) => {
    updateUrlParams({ [key]: value, page: 0 });
  }, [updateUrlParams]);

  const setPage = useCallback((page: number) => {
    updateUrlParams({ page });
  }, [updateUrlParams]);

  const loadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    const currentParams = parseParams();
    performSearch({ ...currentParams, page: nextPage }, true);
    updateUrlParams({ page: nextPage });
  }, [currentPage, parseParams, performSearch, updateUrlParams]);

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasMore = items.length < total;

  return {
    items,
    total,
    totalPages,
    currentPage,
    loading,
    error,
    params,
    setQuery,
    setCategory,
    setSubCategory,
    setFilter,
    setPage,
    loadMore,
    resetFilters,
    hasMore,
  };
}
