import { useState, useEffect, useRef } from 'react';
import { getCurrentToken } from '../../services/tokens';

interface AuthenticatedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  onError?: () => void;
}

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

  useEffect(() => {
    // Cleanup previous blob URL if it exists
    if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
      window.URL.revokeObjectURL(blobUrlRef.current);
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

    // If it's a full URL starting with http/https, fetch with auth
    setLoading(true);
    setError(false);

    const loadImage = async () => {
      try {
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
        setBlobUrl(url);
        blobUrlRef.current = url;
        setError(false);
      } catch (err) {
        console.error('Failed to load authenticated image:', err);
        setError(true);
        if (onError) {
          onError();
        }
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup: revoke blob URL when component unmounts or src changes
    return () => {
      if (blobUrlRef.current && blobUrlRef.current.startsWith('blob:')) {
        window.URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src, onError]);

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

