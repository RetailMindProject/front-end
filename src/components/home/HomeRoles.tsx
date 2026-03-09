import { ArrowRight, ShoppingBag, Store, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FEATURES, type FeatureKey } from "../../config/features";

function RoleCard({
  title,
  icon,
  featureKey,
}: {
  title: string;
  icon: ReactNode;
  featureKey: FeatureKey;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur shadow-sm ring-1 ring-slate-200/70 p-6 sm:p-7 flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-bold text-slate-900">{title}</div>
        <button
          type="button"
          onClick={() => navigate(`/docs/${featureKey}`)}
          aria-label={FEATURES[featureKey].title}
          className="mt-4 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 rounded-xl px-1"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="relative">
        <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-blue-400/10 to-indigo-400/10 blur-xl" />
        <button
          type="button"
          onClick={() => navigate(`/docs/${featureKey}`)}
          aria-label={FEATURES[featureKey].title}
          className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-200/70 shadow-sm grid place-items-center transition-all hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
        >
          {icon}
        </button>
      </div>
    </div>
  );
}

export default function HomeRoles() {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <RoleCard
          title="Customers"
          featureKey="customers"
          icon={<ShoppingBag className="h-8 w-8 text-slate-600" aria-hidden="true" />}
        />
        <RoleCard
          title="Cashiers"
          featureKey="cashiers"
          icon={<UserRound className="h-8 w-8 text-slate-600" aria-hidden="true" />}
        />
        <RoleCard
          title="Managers"
          featureKey="managers"
          icon={<Store className="h-8 w-8 text-slate-600" aria-hidden="true" />}
        />
      </div>
    </section>
  );
}

