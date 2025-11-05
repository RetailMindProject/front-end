import { useState, useEffect } from "react";
import { Camera } from "lucide-react";

interface ProfileAvatarProps {
  firstName: string;
  lastName: string;
  size?: number;
  onPhotoChange?: () => void;
  className?: string;
  avatarImage?: string;
}

export default function ProfileAvatar({
  firstName,
  lastName,
  size = 128,
  onPhotoChange,
  className = "",
  avatarImage,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();

  useEffect(() => {
    if (avatarImage) {
      setImageError(false);
      setImageLoaded(false);
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
        console.log('Image loaded successfully:', avatarImage);
      };
      img.onerror = () => {
        console.error('Image failed to load:', avatarImage);
        setImageError(true);
        setImageLoaded(false);
      };
      img.src = avatarImage;
    }
  }, [avatarImage]);

  const showImage = avatarImage && !imageError && imageLoaded;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="rounded-full bg-white shadow-lg border-4 border-white overflow-hidden relative"
        style={{ 
          width: size, 
          height: size, 
          minWidth: size, 
          minHeight: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {showImage ? (
          <img
            src={avatarImage}
            alt={`${firstName} ${lastName}`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              borderRadius: '50%'
            }}
            onError={() => {
              console.error('Image error:', avatarImage);
              setImageError(true);
              setImageLoaded(false);
            }}
            onLoad={() => {
              console.log('Image onLoad triggered:', avatarImage);
              setImageLoaded(true);
            }}
          />
        ) : (
          <span className="select-none text-4xl font-bold text-blue-600 z-10">{initials}</span>
        )}
      </div>
      {onPhotoChange && (
        <button
          onClick={onPhotoChange}
          className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition z-10"
          aria-label="Change profile photo"
        >
          <Camera size={18} />
        </button>
      )}
    </div>
  );
}

