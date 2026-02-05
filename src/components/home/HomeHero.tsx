import { Brain } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FEATURES } from "../../config/features";
import HeroSystemScene from "./HeroSystemScene";

export default function HomeHero() {
  const navigate = useNavigate();
  return (
    <section className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <div>
          {/* Brand row */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/docs/rag")}
              aria-label={FEATURES.rag.title}
              className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm ring-1 ring-blue-400/20 grid place-items-center transition-all hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/15"
            >
              <Brain className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
            <div className="text-lg font-extrabold tracking-tight text-slate-900">RetailMind</div>
          </div>

          <h1 className="mt-6 text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
            Smart Retail.
            <br />
            <span className="text-slate-700">Powered by AI.</span>
          </h1>

          <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-xl">
            All-in-one POS, inventory, terminals, and AI insights.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/auth/register"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-white font-semibold shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all"
            >
              Get Started
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur px-6 py-3.5 text-slate-900 font-semibold shadow-sm ring-1 ring-slate-200 hover:shadow-md transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="relative">
          <HeroSystemScene />
        </div>
      </div>
    </section>
  );
}

