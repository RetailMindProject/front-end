import { ReactNode } from "react";

interface ProfileBannerProps {
  children: ReactNode;
  className?: string;
}

export default function ProfileBanner({ children, className = "" }: ProfileBannerProps) {
  return (
    <div className={`h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative ${className}`}>
      {children}
    </div>
  );
}

