import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { FEATURES, FEATURE_ICONS, type FeatureKey } from "../config/features";

function isFeatureKey(x: string | undefined): x is FeatureKey {
  if (!x) return false;
  return Object.prototype.hasOwnProperty.call(FEATURES, x);
}

export default function DocsPage() {
  const navigate = useNavigate();
  const { feature } = useParams<{ feature: string }>();

  const data = useMemo(() => {
    if (!isFeatureKey(feature)) return null;
    return { key: feature, ...FEATURES[feature], Icon: FEATURE_ICONS[feature] };
  }, [feature]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white">
      <div className="mx-auto w-full max-w-[1150px] px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-2xl bg-white/80 backdrop-blur px-4 py-2.5 text-slate-900 font-semibold shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-all"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>

        {!data ? (
          <div className="mt-10 rounded-[2rem] bg-white/80 backdrop-blur shadow-sm ring-1 ring-slate-200/70 p-10">
            <div className="text-xl font-bold text-slate-900">Documentation not available</div>
            <div className="mt-2 text-slate-600 text-sm">
              We couldn’t find docs for this feature.
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-[2rem] bg-white/85 backdrop-blur shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 overflow-hidden">
            {/* decorative header */}
            <div className="relative px-8 sm:px-10 py-8 sm:py-9 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.65)_1px,_transparent_0)] bg-[length:32px_32px]" />
              <div className="relative flex items-center gap-5">
                <div className="h-16 w-16 rounded-3xl bg-white/15 ring-1 ring-white/20 grid place-items-center flex-shrink-0 shadow-sm">
                  <data.Icon className="h-8 w-8 text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    {data.title}
                  </div>
                  <div className="mt-2 text-white/85 leading-relaxed max-w-3xl">
                    {data.description}
                  </div>
                </div>
              </div>
            </div>

            {/* content */}
            <div className="px-8 sm:px-10 py-8 sm:py-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                  {data.bullets && data.bullets.length > 0 && (
                    <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200/70 p-6 sm:p-7 shadow-sm">
                      <div className="text-sm font-semibold text-slate-700">At a glance</div>
                      <ul className="mt-4 space-y-3">
                        {data.bullets.slice(0, 4).map((b) => (
                          <li key={b} className="flex items-start gap-3 text-slate-700">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4">
                  {data.usedBy && data.usedBy.length > 0 && (
                    <div className="rounded-3xl bg-white ring-1 ring-slate-200/70 p-6 sm:p-7 shadow-sm">
                      <div className="text-sm font-semibold text-slate-700">Used by</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {data.usedBy.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-200/70 px-3 py-1 text-xs font-semibold"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-3xl bg-gradient-to-b from-white to-slate-50 ring-1 ring-slate-200/70 p-6 sm:p-7 shadow-sm">
                    <div className="text-sm font-semibold text-slate-700">Tip</div>
                    <div className="mt-3 text-slate-600 leading-relaxed">
                      Click any icon in the system to jump straight to its docs page.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

