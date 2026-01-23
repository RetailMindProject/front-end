import { Cloud, Globe, KeyRound, MonitorSmartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FEATURES, type FeatureKey } from "../../config/features";

const ITEMS = [
  { icon: KeyRound, label: "Secure Authentication", key: "sessions" as FeatureKey },
  { icon: MonitorSmartphone, label: "Multi-Terminal Support", key: "sessions" as FeatureKey },
  { icon: Cloud, label: "Cloud Ready", key: "reports" as FeatureKey },
  { icon: Globe, label: "Language Sync", key: "messages" as FeatureKey },
] as const;

export default function HomeReliability() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.30] bg-[radial-gradient(circle_at_25%_30%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.20),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.55)_1px,_transparent_0)] bg-[length:40px_40px]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Security &amp; Reliability
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <div className="w-full rounded-3xl bg-white/10 backdrop-blur border border-white/10 shadow-[0_14px_45px_rgba(0,0,0,0.25)] px-5 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {ITEMS.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={() => navigate(`/docs/${it.key}`)}
                    aria-label={FEATURES[it.key].title}
                    className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10 grid place-items-center">
                      <it.icon className="h-5 w-5 text-white/90" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-semibold text-white/90 leading-snug">
                      {it.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

