import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "../services/customer.api";
import { getCurrentToken, clearAllTokens } from "../services/tokens";
import type { UserProfileResponse } from "../types/customer.api";

export function useAuth() {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    const token = getCurrentToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const result = await customerApi.getCurrentUser();
      if (result.data) {
        setUser(result.data);
      } else if (result.error) {
        // Token might be invalid
        clearAllTokens();
        navigate("/login");
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      clearAllTokens();
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    clearAllTokens();
    navigate("/login");
  }, [navigate]);

  return { user, loading, logout, refreshUser: loadUser };
}

