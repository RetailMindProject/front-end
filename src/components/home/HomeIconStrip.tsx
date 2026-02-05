import { useNavigate } from "react-router-dom";
import { FEATURES, FEATURE_ICONS, type FeatureKey } from "../../config/features";

const ICON_KEYS: FeatureKey[] = [
  "inventory",
  "rag",
  "recommendation",
  "forecasting",
  "sessions",
  "payments",
  "reports",
  "history",
];

export default function HomeIconStrip() {
  const navigate = useNavigate();
  return (
    <section className="mt-10 sm:mt-12">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
        {ICON_KEYS.map((key) => {
          const Icon = FEATURE_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/docs/${key}`)}
              aria-label={FEATURES[key].title}
              className="group rounded-2xl bg-white/80 backdrop-blur shadow-sm ring-1 ring-slate-200/70 p-4 grid place-items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <Icon className="h-6 w-6 text-slate-500/90" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

