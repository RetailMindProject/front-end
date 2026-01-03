// Tokens for different roles
// Each role has its own token stored in localStorage (set after login)

export type UserRole = 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO' | 'CASHIER';

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
  if (role === 'STORE_MANAGER' || role === 'INVENTORY_MANAGER' || role === 'CEO' || role === 'CASHIER') {
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
  if (pathname.startsWith('/cashier')) {
    return 'CASHIER';
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
 * PRIORITY: URL-based role > userInfo role > token validation
 * This ensures we use the correct token for the current context
 */
export function getCurrentToken(): string | null {
  const currentRole = getCurrentRole();
  
  // PRIORITY 1: If we have a current role from URL, use token for that role
  // This is the most reliable way to ensure correct token isolation
  if (currentRole) {
    const roleToken = getTokenForRole(currentRole);
    if (roleToken) {
      // Validate that token role matches URL role
      const tokenRole = getRoleFromToken(roleToken);
      if (tokenRole === currentRole) {
        return roleToken;
      }
      // If token role doesn't match, don't use it (prevents cross-role contamination)
    }
  }
  
  // PRIORITY 2: Try to get token from userInfo role
  // But only if it matches the current route role
  const userInfo = getUserInfo();
  if (userInfo?.role) {
    // Only use userInfo token if it matches current route
    if (!currentRole || userInfo.role === currentRole) {
      const roleToken = getTokenForRole(userInfo.role);
      if (roleToken) {
        const tokenRole = getRoleFromToken(roleToken);
        if (tokenRole === userInfo.role) {
          return roleToken;
        }
      }
    }
  }
  
  // PRIORITY 3: If no current role from URL, try to find any valid token
  // This is a fallback for pages that don't have role-specific routes
  if (!currentRole) {
    const roles: UserRole[] = ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CEO', 'CASHIER'];
    for (const role of roles) {
      const token = getTokenForRole(role);
      if (token) {
        const tokenRole = getRoleFromToken(token);
        if (tokenRole === role) {
          return token;
        }
      }
    }
  }
  
  // Fallback: try to get generic authToken (legacy support)
  const genericToken = localStorage.getItem('authToken');
  if (genericToken && genericToken.split('.').length === 3) {
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
 * Clear user info for a specific role
 */
export function clearUserInfoForRole(role: UserRole): void {
  localStorage.removeItem(`userInfo_${role}`);
  // Also clear generic userInfo if it matches the role
  const userInfo = getUserInfo();
  if (userInfo?.role === role) {
    localStorage.removeItem('userInfo');
  }
}

/**
 * Clear all data for a specific role (token + userInfo + sessionId if cashier)
 */
export function clearRoleData(role: UserRole): void {
  clearTokenForRole(role);
  clearUserInfoForRole(role);
  
  // If clearing cashier data, also clear session-related data
  if (role === 'CASHIER') {
    clearSessionId();
    // Clear any cashier-specific session data
    sessionStorage.clear();
  }
}

/**
 * Clear all tokens (use with caution - only for full logout)
 */
export function clearAllTokens(): void {
  // Clear all role-specific tokens
  const roles: UserRole[] = ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CEO', 'CASHIER'];
  roles.forEach(role => {
    localStorage.removeItem(`authToken_${role}`);
    localStorage.removeItem(`userInfo_${role}`);
  });
  // Clear generic authToken if exists
  localStorage.removeItem('authToken');
  // Clear generic user info
  localStorage.removeItem('userInfo');
  // Clear cached session id if exists
  localStorage.removeItem('currentSessionId');
  // Clear session storage
  sessionStorage.clear();
}

/**
 * Store user info after login
 */
export interface UserInfo {
  id?: number;
  userId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  sessionId?: number;
  terminalId?: number;
  terminalCode?: string;
}

/**
 * Set user info for a specific role
 * This ensures userInfo is isolated per role
 */
export function setUserInfo(userInfo: UserInfo): void {
  // Store userInfo with role-specific key to prevent cross-contamination
  const role = userInfo.role;
  localStorage.setItem(`userInfo_${role}`, JSON.stringify(userInfo));
  // Also store in generic key for backward compatibility
  localStorage.setItem('userInfo', JSON.stringify(userInfo));
}

/**
 * Get stored user info
 * Tries to get role-specific userInfo first, then falls back to generic
 */
export function getUserInfo(role?: UserRole): UserInfo | null {
  // If role is specified, try to get role-specific userInfo first
  if (role) {
    const roleStored = localStorage.getItem(`userInfo_${role}`);
    if (roleStored) {
      try {
        return JSON.parse(roleStored);
      } catch {
        // Continue to fallback
      }
    }
  }
  
  // Try to get from current role
  const currentRole = getCurrentRole();
  if (currentRole) {
    const roleStored = localStorage.getItem(`userInfo_${currentRole}`);
    if (roleStored) {
      try {
        return JSON.parse(roleStored);
      } catch {
        // Continue to fallback
      }
    }
  }
  
  // Fallback to generic userInfo (for backward compatibility)
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

/**
 * Get stored session ID for cashier
 */
export function getSessionId(): number | null {
  const userInfo = getUserInfo();
  if (userInfo?.sessionId) {
    return userInfo.sessionId;
  }
  
  // Fallback: try to get from localStorage directly
  const stored = localStorage.getItem('currentSessionId');
  if (stored) {
    const sessionId = parseInt(stored, 10);
    if (!isNaN(sessionId)) {
      return sessionId;
    }
  }
  
  return null;
}

/**
 * Set session ID for cashier
 */
export function setSessionId(sessionId: number): void {
  // Save in userInfo
  const userInfo = getUserInfo();
  if (userInfo) {
    setUserInfo({ ...userInfo, sessionId });
  }
  
  // Also save directly in localStorage as backup
  localStorage.setItem('currentSessionId', sessionId.toString());
}

export function clearSessionId(): void {
  const userInfo = getUserInfo();
  if (userInfo) {
    const { sessionId, ...rest } = userInfo;
    setUserInfo({ ...rest });
  }
  localStorage.removeItem('currentSessionId');
}

