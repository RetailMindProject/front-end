import { useState, useEffect, useCallback } from "react";
import { customerApi } from "../services/customer.api";
import type { OrdersResponse } from "../types/customer.api";

export function useOrders() {
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Get orders from last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString();

    try {
      const result = await customerApi.getOrders(sinceISO, 50);

      if (result.data) {
        setOrders(result.data);
      } else if (result.error) {
        setError(result.error);
        setOrders(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);
      setOrders(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
}

