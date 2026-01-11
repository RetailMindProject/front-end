import { useState, useEffect, useCallback } from "react";
import { customerApi } from "../services/customer.api";
import type { RecommendationsResponse } from "../types/customer.api";

/**
 * Hook to fetch recommendations for the authenticated user.
 * Backend extracts customerId from JWT, so no customerId parameter needed.
 * 
 * Behavior:
 * - 404 (endpoint not implemented): Returns null data, no error (graceful degradation)
 * - 401/403 (auth): Returns null data, no error (auth handled globally)
 * - 5xx/network: Returns null data, no error (fail safe)
 * - Success: Returns recommendations data
 * 
 * Retry: 1-2 times on network/server errors (not on 4xx)
 */
export function useRecommendations(topK: number = 10) {
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true); // Track if endpoint exists

  const fetchRecommendations = useCallback(async (retryCount = 0) => {
    setLoading(true);
    setError(null);

    try {
      const result = await customerApi.getRecommendations(topK, 500, true);
      
      if (result.data) {
        setRecommendations(result.data);
        setIsAvailable(true);
      } else {
        // Handle endpoint missing (404) - graceful degradation
        if (result.isEndpointMissing) {
          setIsAvailable(false);
          setRecommendations(null);
          setError(null); // No error shown to user
          return;
        }
        
        // Handle auth errors - should not happen if token is valid
        if (result.error === "Unauthorized") {
          setIsAvailable(false);
          setRecommendations(null);
          setError(null); // Auth handled globally
          return;
        }
        
        // All other errors: fail safe - hide widget
        setIsAvailable(false);
        setRecommendations(null);
        setError(null);
      }
    } catch (err) {
      // Network/timeout errors: retry 1-2 times
      if (retryCount < 2 && (err instanceof TypeError || err instanceof Error)) {
        // Retry after short delay
        setTimeout(() => {
          fetchRecommendations(retryCount + 1);
        }, 1000);
        return;
      }
      
      // After retries or non-retryable error: fail safe
      setIsAvailable(false);
      setRecommendations(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [topK]);

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

