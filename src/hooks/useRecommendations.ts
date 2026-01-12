import { useState, useEffect, useCallback } from "react";
import { customerApi } from "../services/customer.api";
import type { RecommendationsResponse } from "../types/customer.api";

/**
 * Hook to fetch recommendations for the authenticated user.
 * Backend extracts customerId from JWT, so no customerId parameter needed.
 * 
 * Behavior:
 * - 404 (endpoint not implemented): Returns null data, no error (graceful degradation)
 * - 401/403 (auth): Returns error (triggers logout/redirect)
 * - 5xx/network: Returns error (non-blocking message)
 * - HTTP 200 with status="error": Returns data with status="error" (non-blocking message)
 * - Success: Returns recommendations data
 * 
 * Retry: 1-2 times on network/server errors (not on 4xx)
 */
export function useRecommendations(
  topK: number = 10,
  candidateLimit: number = 500,
  inStockOnly: boolean = true
) {
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true); // Track if endpoint exists

  const fetchRecommendations = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await customerApi.getRecommendations(topK, candidateLimit, inStockOnly);
      
      // Log for debugging
      console.log('[useRecommendations] API result:', {
        hasData: !!result.data,
        status: result.status,
        error: result.error,
        isEndpointMissing: result.isEndpointMissing,
        dataStatus: result.data?.status,
      });
      
      // Handle endpoint missing (404) - graceful degradation
      if (result.isEndpointMissing) {
        console.log('[useRecommendations] Endpoint missing (404)');
        setIsAvailable(false);
        setRecommendations(null);
        setError(null); // No error shown to user
        setLoading(false);
        return;
      }
      
      // Handle auth errors (401/403) - trigger logout/redirect (handled by API client)
      if (result.status === 401 || result.status === 403) {
        setIsAvailable(false);
        setRecommendations(null);
        setError(result.error || "Authentication required");
        setLoading(false);
        // API client already handles redirect to login
        return;
      }
      
      // Handle HTTP 200 with status="error" (Recommendation Service down/timeout)
      if (result.data && result.data.status === "error") {
        // Still set data so UI can show error message non-blockingly
        setRecommendations(result.data);
        setIsAvailable(true);
        setError(result.data.message || "Recommendation service is temporarily unavailable");
        setLoading(false);
        return;
      }
      
      // Handle other errors (5xx, network, etc.)
      if (result.error && !result.data) {
        console.log('[useRecommendations] Error without data:', result.error, 'status:', result.status);
        // Network/timeout errors: retry 1-2 times
        const status = result.status ?? 0;
        if (retryCount < 2 && (status === 0 || status >= 500)) {
          console.log('[useRecommendations] Retrying...', retryCount + 1);
          setTimeout(() => {
            fetchRecommendations(retryCount + 1);
          }, 1000);
          return;
        }
        
        // After retries or non-retryable error: show error message but keep section visible
        setIsAvailable(true); // Keep available so section shows with error
        setRecommendations(null);
        setError(result.error);
        setLoading(false);
        return;
      }
      
      // Success case
      if (result.data && result.data.status === "success") {
        console.log('[useRecommendations] Success!', {
          forYou: result.data.rows.forYou.length,
          popular: result.data.rows.popular.length,
          offers: result.data.rows.offers.length,
        });
        setRecommendations(result.data);
        setIsAvailable(true);
        setError(null);
      } else {
        // Unexpected state
        console.log('[useRecommendations] Unexpected state:', result);
        setIsAvailable(true); // Keep available so section shows
        setRecommendations(null);
        setError("Unexpected response from server");
      }
    } catch (err) {
      // Network/timeout errors: retry 1-2 times
      if (retryCount < 2 && (err instanceof TypeError || err instanceof Error)) {
        setTimeout(() => {
          fetchRecommendations(retryCount + 1);
        }, 1000);
        return;
      }
      
      // After retries or non-retryable error: show error
      setIsAvailable(false);
      setRecommendations(null);
      setError(err instanceof Error ? err.message : "Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [topK, candidateLimit, inStockOnly]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    isAvailable, // Whether endpoint exists and returned data
    refetch: () => fetchRecommendations(0),
  };
}

