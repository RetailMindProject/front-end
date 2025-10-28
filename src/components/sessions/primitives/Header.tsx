import type { ReactNode } from "react";

export default function Header({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-gray-800">
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100">{icon}</div>
      <h2 className="text-lg font-medium leading-none tracking-tight">{title}</h2>
    </div>
  );
}