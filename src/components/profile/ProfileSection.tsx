import type { ReactNode } from "react";

interface ProfileSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ProfileSection({
  title,
  icon,
  children,
  className = "",
}: ProfileSectionProps) {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

