import { useNavigate } from "react-router-dom";
import { FEATURES, FEATURE_ICONS, type FeatureKey } from "../../config/features";

const AI_PILLS: Array<{ key: FeatureKey; label: string }> = [
  { key: "recommendation", label: "Personalized Recommendations" },
  { key: "forecasting", label: "Sales Forecasting" },
  { key: "rag", label: "AI Smart Assistant" },
  { key: "reports", label: "Real-time insights" },
] as const;

export default function HomeAISection() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(circle_at_50%_80%,rgba(56,189,248,0.18),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.16] bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.55)_1px,_transparent_0)] bg-[length:34px_34px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              AI at the Core
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {AI_PILLS.map((f) => {
              const DocIcon = FEATURE_ICONS[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => navigate(`/docs/${f.key}`)}
                  aria-label={FEATURES[f.key].title}
                  className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 px-4 py-4 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-all hover:bg-white/12 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                  <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10 grid place-items-center flex-shrink-0">
                    <DocIcon className="h-5 w-5 text-white/90" aria-hidden="true" />
                  </div>
                  <div className="text-sm font-semibold text-white/90 leading-snug text-left">
                    {f.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

