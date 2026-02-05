import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchParams, SearchResponse, ProductCard } from "../types/customer.search";
import { customerSearchService } from "../services/customer.search.mock";

interface UseProductSearchReturn {
  // State
  items: ProductCard[];
  total: number;
  loading: boolean;
  error: string | null;
  params: SearchParams;
  
  // Actions
  setQuery: (q: string) => void;
  setCategory: (categoryId: number | undefined) => void;
  setSubCategory: (subCategoryId: number | undefined) => void;
  setFilter: (key: keyof SearchParams, value: any) => void;
  loadMore: () => void;
  resetFilters: () => void;
  hasMore: boolean;
}

const DEFAULT_SIZE = 20;

export function useProductSearch(): UseProductSearchReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const debounceTimerRef = useRef<number | null>(null);

  // Parse URL params to SearchParams
  const parseParams = useCallback((): SearchParams => {
    return {
      q: searchParams.get("q") || undefined,
      categoryId: searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined,
      subCategoryId: searchParams.get("subCategoryId") ? Number(searchParams.get("subCategoryId")) : undefined,
      inStockOnly: searchParams.get("inStockOnly") === "true",
      offersOnly: searchParams.get("offersOnly") === "true",
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
      sort: (searchParams.get("sort") as SearchParams["sort"]) || "relevance",
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
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
    const shouldShowProducts = 
      (searchParams.subCategoryId !== undefined) || 
      (searchParams.q !== undefined && searchParams.q.trim() !== "");

    if (!shouldShowProducts) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: SearchResponse = await customerSearchService.searchProducts(searchParams);
      
      if (append) {
        setItems((prev) => [...prev, ...response.items]);
      } else {
        setItems(response.items);
      }
      
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search products");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const debouncedSearch = useCallback((searchParams: SearchParams) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      performSearch(searchParams, false);
    }, 300);
  }, [performSearch]);

  // Initial load and when params change
  useEffect(() => {
    const currentParams = parseParams();
    
    // Determine if we should show products
    const shouldShowProducts = 
      (currentParams.subCategoryId !== undefined) || 
      (currentParams.q !== undefined && currentParams.q.trim() !== "");

    if (!shouldShowProducts) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    
    // If query exists, use debounced search
    if (currentParams.q && currentParams.q.trim()) {
      debouncedSearch({ ...currentParams, page: 1 });
    } else {
      // Immediate search for category/subcategory
      performSearch({ ...currentParams, page: 1 }, false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchParams, parseParams, debouncedSearch, performSearch]);

  // Actions
  const setQuery = useCallback((q: string) => {
    updateUrlParams({ q, page: 1 });
  }, [updateUrlParams]);

  const setCategory = useCallback((categoryId: number | undefined) => {
    updateUrlParams({ 
      categoryId, 
      subCategoryId: undefined, // Reset subcategory when category changes
      page: 1 
    });
  }, [updateUrlParams]);

  const setSubCategory = useCallback((subCategoryId: number | undefined) => {
    updateUrlParams({ subCategoryId, page: 1 });
  }, [updateUrlParams]);

  const setFilter = useCallback((key: keyof SearchParams, value: any) => {
    updateUrlParams({ [key]: value, page: 1 });
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
    loading,
    error,
    params,
    setQuery,
    setCategory,
    setSubCategory,
    setFilter,
    loadMore,
    resetFilters,
    hasMore,
  };
}
