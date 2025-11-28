import type { Message } from "./types";

interface MessageBadgeProps {
  from: Message["from"];
  size?: "sm" | "md";
  className?: string;
}

export default function MessageBadge({ from, size = "sm", className = "" }: MessageBadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  const getBadgeConfig = () => {
    if (from === "CEO") {
      return { classes: "bg-purple-100 text-purple-700", icon: "👔" };
    } else if (from === "Store Manager") {
      return { classes: "bg-indigo-100 text-indigo-700", icon: "🏪" };
    } else {
      return { classes: "bg-blue-100 text-blue-700", icon: "📦" };
    }
  };

  const { classes: badgeClasses, icon } = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${badgeClasses} ${className}`}
    >
      {icon}
      {from}
    </span>
  );
}

