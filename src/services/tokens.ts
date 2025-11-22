// Tokens for different roles (temporary until login is implemented)
// Each role has its own token stored in localStorage

export type UserRole = 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO';

// Default tokens for each role (fallback if not in localStorage)
const DEFAULT_TOKENS: Record<UserRole, string> = {
  STORE_MANAGER: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiU1RPUkVfTUFOQUdFUiIsInN1YiI6ImFobWFkQGV4YW1wbGUuY29tIiwiaWF0IjoxNzYzODM2NDE5LCJleHAiOjE3NjM5MjI4MTl9.lRdR92h9M0okZYNKuV3Yyeux1lxneJO46ulsHGQWU2g",
  INVENTORY_MANAGER: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiSU5WRU5UT1JZX01BTkFHRVIiLCJzdWIiOiJhaG1hZEVAZXhhbXBsZS5jb20iLCJpYXQiOjE3NjM4MzcyNjMsImV4cCI6MTc2MzkyMzY2M30.PQbY4mKVthGkvl5ETznevgn6aVQKBIpCF93nLLhutns",
  CEO: "", // Add CEO token when available
};

/**
 * Get the current role based on the URL path
 */
export function getCurrentRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  
  const pathname = window.location.pathname;
  
  if (pathname.startsWith('/store-manager')) {
    return 'STORE_MANAGER';
  }
  if (pathname.startsWith('/inventory-manager')) {
    return 'INVENTORY_MANAGER';
  }
  if (pathname.startsWith('/ceo')) {
    return 'CEO';
  }
  
  return null;
}

/**
 * Get token for a specific role
 */
export function getTokenForRole(role: UserRole): string | null {
  // First, try to get from localStorage
  const storedToken = localStorage.getItem(`authToken_${role}`);
  if (storedToken) {
    return storedToken;
  }
  
  // Fallback to default token
  return DEFAULT_TOKENS[role] || null;
}

/**
 * Set token for a specific role
 */
export function setTokenForRole(role: UserRole, token: string): void {
  localStorage.setItem(`authToken_${role}`, token);
}

/**
 * Get the current user's token based on the current route
 */
export function getCurrentToken(): string | null {
  const role = getCurrentRole();
  if (!role) {
    // Fallback: try to get generic authToken
    return localStorage.getItem('authToken') || null;
  }
  
  return getTokenForRole(role);
}

/**
 * Clear token for a specific role
 */
export function clearTokenForRole(role: UserRole): void {
  localStorage.removeItem(`authToken_${role}`);
}

/**
 * Clear all tokens
 */
export function clearAllTokens(): void {
  Object.keys(DEFAULT_TOKENS).forEach(role => {
    localStorage.removeItem(`authToken_${role as UserRole}`);
  });
  localStorage.removeItem('authToken');
}

