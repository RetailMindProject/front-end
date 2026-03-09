import { X, LucideIcon } from "lucide-react";
import { FEATURES, FEATURE_ICONS, type FeatureKey } from "../../config/features";

interface FeatureDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
  featureKey: FeatureKey | null;
}

export default function FeatureDetailsModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  featureKey,
}: FeatureDetailsModalProps) {
  if (!isOpen || !featureKey) return null;

  const data = FEATURES[featureKey];

  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative px-8 sm:px-10 py-8 sm:py-9 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_2px_2px,_rgba(255,255,255,0.65)_1px,_transparent_0)] bg-[length:32px_32px]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-3xl bg-white/15 ring-1 ring-white/20 grid place-items-center flex-shrink-0 shadow-sm">
                <Icon className="h-8 w-8 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {title}
                </div>
                <div className="mt-2 text-white/85 leading-relaxed max-w-3xl">
                  {description}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 sm:px-10 py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {data.bullets && data.bullets.length > 0 && (
                <div className="rounded-3xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200/70 p-6 sm:p-7 shadow-sm">
                  <div className="text-sm font-semibold text-slate-700">At a glance</div>
                  <ul className="mt-4 space-y-3">
                    {data.bullets.map((b) => (
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
    </div>
  );
}
