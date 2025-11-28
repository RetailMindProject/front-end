// Tokens for different roles
// Each role has its own token stored in localStorage (set after login)

export type UserRole = 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO';

/**
 * Decode JWT token to extract payload (without verification)
 * Note: This only decodes the token, it doesn't verify the signature
 */
export function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Get role from JWT token
 */
export function getRoleFromToken(token: string | null): UserRole | null {
  if (!token) return null;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.role) return null;
  
  const role = decoded.role.toUpperCase();
  if (role === 'STORE_MANAGER' || role === 'INVENTORY_MANAGER' || role === 'CEO') {
    return role as UserRole;
  }
  
  return null;
}

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
  return localStorage.getItem(`authToken_${role}`);
}

/**
 * Set token for a specific role
 */
export function setTokenForRole(role: UserRole, token: string): void {
  localStorage.setItem(`authToken_${role}`, token);
}

/**
 * Get the current user's token based on the current route
 * First tries to get token from JWT if available, then falls back to URL-based role
 */
export function getCurrentToken(): string | null {
  // First, try to get token from any role and verify it matches current route
  const roles: UserRole[] = ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CEO'];
  
  for (const role of roles) {
    const token = getTokenForRole(role);
    if (token) {
      const tokenRole = getRoleFromToken(token);
      const currentRole = getCurrentRole();
      
      // If token role matches current route role, use it
      if (tokenRole === currentRole) {
        return token;
      }
      
      // If no current role from URL, use the first valid token found
      if (!currentRole) {
        return token;
      }
    }
  }
  
  // Fallback: try to get generic authToken
  const genericToken = localStorage.getItem('authToken');
  if (genericToken) {
    return genericToken;
  }
  
  return null;
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
  // Clear all role-specific tokens
  const roles: UserRole[] = ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CEO'];
  roles.forEach(role => {
    localStorage.removeItem(`authToken_${role}`);
  });
  // Clear generic authToken if exists
  localStorage.removeItem('authToken');
  // Clear user info
  localStorage.removeItem('userInfo');
}

/**
 * Store user info after login
 */
export interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  role: UserRole;
}

export function setUserInfo(userInfo: UserInfo): void {
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

/**
 * Get stored user info
 */
export function getUserInfo(): UserInfo | null {
  const stored = localStorage.getItem('userInfo');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Get user display name (firstName + lastName or email)
 */
export function getUserDisplayName(): string {
  const userInfo = getUserInfo();
  if (userInfo) {
    if (userInfo.firstName && userInfo.lastName) {
      return `${userInfo.firstName} ${userInfo.lastName}`;
    }
    if (userInfo.firstName) {
      return userInfo.firstName;
    }
    if (userInfo.email) {
      return userInfo.email;
    }
  }
  
  // Fallback: try to get from JWT token
  const token = getCurrentToken();
  if (token) {
    const decoded = decodeJWT(token);
    if (decoded) {
      if (decoded.firstName && decoded.lastName) {
        return `${decoded.firstName} ${decoded.lastName}`;
      }
      if (decoded.firstName) {
        return decoded.firstName;
      }
      if (decoded.sub || decoded.email) {
        return decoded.sub || decoded.email;
      }
    }
  }
  
  return "Guest";
}

