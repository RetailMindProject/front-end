import { useNavigate } from "react-router-dom";
import { KeyRound, MonitorSmartphone, Mail, LucideIcon } from "lucide-react";
import { type FeatureKey } from "../../config/features";

interface CardConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  featureKey: FeatureKey;
}

const CARDS: CardConfig[] = [
  {
    id: "secure-auth",
    title: "Secure Authentication",
    description: "Advanced security measures to protect your POS system and user data with encrypted sessions and secure access controls.",
    icon: KeyRound,
    featureKey: "sessions",
  },
  {
    id: "multi-terminal",
    title: "Multi-Terminal Support",
    description: "Seamlessly manage multiple POS terminals across your store with real-time synchronization and conflict prevention.",
    icon: MonitorSmartphone,
    featureKey: "sessions",
  },
  {
    id: "email",
    title: "Email Communication",
    description: "Integrated email system for sending receipts, promotions, and customer service messages.",
    icon: Mail,
    featureKey: "email",
  },
];

export default function HomeReliability() {
  const navigate = useNavigate();

  const handleCardClick = (card: CardConfig) => {
    // Navigate to docs page with custom title/description in state
    navigate(`/docs/${card.featureKey}`, {
      state: {
        title: card.title,
        description: card.description,
      },
    });
  };

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardClick(card)}
                    aria-label={card.title}
                    className="rounded-2xl bg-white/5 border border-white/10 px-4 py-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10 grid place-items-center">
                      <card.icon className="h-5 w-5 text-white/90" aria-hidden="true" />
                    </div>
                    <div className="text-sm font-semibold text-white/90 leading-snug">
                      {card.title}
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

