import { AlertTriangle, BarChart3, LineChart, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FEATURES, type FeatureKey } from "../../config/features";

function MiniLine() {
  return (
    <div className="mt-4 h-12 rounded-xl bg-gradient-to-b from-blue-50 to-white ring-1 ring-slate-200/70 flex items-end gap-1 p-2">
      <div className="h-3 w-2 rounded bg-blue-200/70" />
      <div className="h-5 w-2 rounded bg-blue-300/70" />
      <div className="h-4 w-2 rounded bg-blue-200/70" />
      <div className="h-7 w-2 rounded bg-blue-400/70" />
      <div className="h-6 w-2 rounded bg-blue-300/70" />
      <div className="h-8 w-2 rounded bg-blue-500/70" />
      <div className="h-7 w-2 rounded bg-blue-400/70" />
      <div className="h-10 w-2 rounded bg-blue-600/70" />
    </div>
  );
}

function MiniBars() {
  return (
    <div className="mt-4 h-12 rounded-xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200/70 flex items-end gap-1 p-2">
      <div className="h-4 w-2 rounded bg-slate-300/70" />
      <div className="h-7 w-2 rounded bg-slate-400/70" />
      <div className="h-5 w-2 rounded bg-slate-300/70" />
      <div className="h-9 w-2 rounded bg-slate-500/70" />
      <div className="h-6 w-2 rounded bg-slate-400/70" />
      <div className="h-10 w-2 rounded bg-slate-600/70" />
      <div className="h-7 w-2 rounded bg-slate-400/70" />
      <div className="h-8 w-2 rounded bg-slate-500/70" />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  rightBadge,
  chart,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  rightBadge?: ReactNode;
  chart: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-600">{title}</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="flex items-center gap-2">
          {rightBadge}
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-50 to-white ring-1 ring-slate-200/70 shadow-sm grid place-items-center text-slate-700">
            {icon}
          </div>
        </div>
      </div>
      {chart}
    </div>
  );
}

export default function HomeStats() {
  const navigate = useNavigate();

  const iconButton = (key: FeatureKey, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => navigate(`/docs/${key}`)}
      aria-label={FEATURES[key].title}
      className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-50 to-white ring-1 ring-slate-200/70 shadow-sm grid place-items-center text-slate-700 transition-all hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
    >
      {icon}
    </button>
  );

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today’s Sales"
          value="$1,260"
          icon={iconButton("reports", <Wallet className="h-5 w-5" aria-hidden="true" />)}
          chart={<MiniLine />}
        />
        <StatCard
          title="Low Stock Alerts"
          value="8 items"
          rightBadge={
            <div className="rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 px-2.5 py-1 text-xs font-semibold">
              Alert
            </div>
          }
          icon={iconButton("inventory", <BarChart3 className="h-5 w-5" aria-hidden="true" />)}
          chart={<MiniBars />}
        />
        <StatCard
          title="Forecast Alert"
          value="7 warnings"
          icon={iconButton("forecasting", <AlertTriangle className="h-5 w-5" aria-hidden="true" />)}
          chart={<MiniLine />}
        />
        <StatCard
          title="Active Sessions"
          value="6 sessions"
          icon={iconButton("sessions", <LineChart className="h-5 w-5" aria-hidden="true" />)}
          chart={<MiniBars />}
        />
      </div>
    </section>
  );
}

