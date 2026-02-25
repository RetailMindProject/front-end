import { useState, useEffect, useRef } from 'react';
import { getCurrentToken } from '../../services/tokens';

interface AuthenticatedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  onError?: () => void;
}

// ✅ OPTIMIZED: Global cache to prevent fetching the same image multiple times
const imageCache = new Map<string, { blobUrl: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingFetches = new Map<string, Promise<string>>();

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [url, data] of imageCache.entries()) {
    if (now - data.timestamp > CACHE_DURATION) {
      if (data.blobUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(data.blobUrl);
      }
      imageCache.delete(url);
    }
  }
}, 60000); // Clean up every minute

export default function AuthenticatedImage({
  src,
  alt,
  className = '',
  fallbackIcon,
  onError
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Cleanup previous blob URL if it exists (but don't revoke if it's in cache)
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      const isCached = Array.from(imageCache.values()).some(cache => cache.blobUrl === blobUrlRef.current);
      if (!isCached) {
        window.URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = null;
    }

    if (!src) {
      setBlobUrl(null);
      setLoading(false);
      setError(true);
      return;
    }

    // If it's already a blob URL or data URL, use it directly
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      blobUrlRef.current = src.startsWith('blob:') ? src : null;
      setLoading(false);
      setError(false);
      return;
    }

    // ✅ OPTIMIZED: Check cache first
    const cached = imageCache.get(src);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setBlobUrl(cached.blobUrl);
      blobUrlRef.current = cached.blobUrl;
      setLoading(false);
      setError(false);
      return;
    }

    // ✅ OPTIMIZED: Check if there's already a pending fetch for this image
    const pendingFetch = pendingFetches.get(src);
    if (pendingFetch) {
      pendingFetch.then(url => {
        if (mountedRef.current) {
          setBlobUrl(url);
          blobUrlRef.current = url;
          setLoading(false);
          setError(false);
        }
      }).catch(() => {
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
          if (onError) {
            onError();
          }
        }
      });
      return;
    }

    // If it's a full URL starting with http/https, fetch with auth
    setLoading(true);
    setError(false);

    const loadImage = async (): Promise<string> => {
      const token = getCurrentToken();
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(src, { headers });
      
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // ✅ OPTIMIZED: Cache the result
      imageCache.set(src, { blobUrl: url, timestamp: Date.now() });
      
      return url;
    };

    // ✅ OPTIMIZED: Store the promise so other components can wait for it
    const fetchPromise = loadImage()
      .then(url => {
        pendingFetches.delete(src);
        if (mountedRef.current) {
          setBlobUrl(url);
          blobUrlRef.current = url;
          setError(false);
          setLoading(false);
        }
        return url;
      })
      .catch(err => {
        console.error('Failed to load authenticated image:', err);
        pendingFetches.delete(src);
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
          if (onError) {
            onError();
          }
        }
        throw err;
      });
    
    pendingFetches.set(src, fetchPromise);

    // Cleanup: revoke blob URL when component unmounts or src changes (but not if cached)
    return () => {
      mountedRef.current = false;
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        const isCached = Array.from(imageCache.values()).some(cache => cache.blobUrl === blobUrlRef.current);
        if (!isCached) {
          window.URL.revokeObjectURL(blobUrlRef.current);
        }
        blobUrlRef.current = null;
      }
    };
  }, [src]); // Removed onError from dependencies to prevent unnecessary re-fetches

  if (error || !blobUrl) {
    return fallbackIcon ? (
      <>{fallbackIcon}</>
    ) : (
      <div className={`bg-amber-100 border border-amber-200 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-2xl">📦</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onError={() => {
        setError(true);
        if (onError) {
          onError();
        }
      }}
    />
  );
}

