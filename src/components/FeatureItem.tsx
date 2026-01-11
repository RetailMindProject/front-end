import type { ReactNode } from "react";

interface Props { 
  icon: ReactNode; 
  text: string; 
}

export default function FeatureItem({ icon, text }: Props) {
  return (
    <div className="flex items-center gap-4 group cursor-default">
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0066FF]/10 to-[#0044CC]/10 border border-[#0066FF]/20 group-hover:from-[#0066FF]/20 group-hover:to-[#0044CC]/20 group-hover:scale-110 transition-all duration-300">
        <div className="text-[#0066FF]">
          {icon}
        </div>
      </div>
      <span className="text-slate-700 group-hover:text-slate-900 font-medium transition-colors duration-200">
        {text}
      </span>
    </div>
  );
}
