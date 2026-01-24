import { Brain } from "lucide-react";

function DashboardLayer() {
  return (
    <div className="relative rounded-[2.25rem] bg-gradient-to-b from-white to-[#f6f9ff] shadow-[0_26px_70px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 overflow-hidden">
      {/* subtle pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.10] bg-[radial-gradient(circle_at_2px_2px,_rgb(37_99_235)_1px,_transparent_0)] bg-[length:36px_36px]" />

      {/* browser bar */}
      <div className="relative flex items-center justify-between px-6 py-5 border-b border-slate-200/70">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="h-3 w-44 rounded-full bg-slate-200" />
      </div>

      {/* dashboard content */}
      <div className="relative p-6">
        <div className="grid grid-cols-12 gap-4">
          {/* line chart card */}
          <div className="col-span-7 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-24 rounded bg-slate-200" />
                <div className="h-6 w-20 rounded bg-slate-100" />
              </div>
              <div className="h-8 w-20 rounded-full bg-blue-50 ring-1 ring-blue-100" />
            </div>
            <div className="mt-5 h-28 rounded-2xl bg-gradient-to-b from-blue-50 to-white ring-1 ring-slate-200/60 p-4 overflow-hidden">
              {/* faux "line" using gradient segments */}
              <div className="h-full w-full rounded-xl bg-[linear-gradient(90deg,rgba(59,130,246,0.10),rgba(99,102,241,0.08))]" />
              <div className="pointer-events-none -mt-[88px] h-24 w-full rounded-xl bg-[radial-gradient(circle_at_25%_35%,rgba(59,130,246,0.35),transparent_60%),radial-gradient(circle_at_65%_55%,rgba(99,102,241,0.25),transparent_55%)]" />
            </div>
          </div>

          {/* right column */}
          <div className="col-span-5 space-y-4">
            {/* bar chart card */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 p-5">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded bg-slate-200" />
                <div className="h-8 w-16 rounded-full bg-slate-50 ring-1 ring-slate-200" />
              </div>
              <div className="mt-4 h-20 rounded-2xl bg-gradient-to-b from-slate-50 to-white ring-1 ring-slate-200/60 p-3">
                <div className="flex h-full items-end gap-2">
                  <div className="h-[40%] w-2 rounded bg-blue-300/70" />
                  <div className="h-[65%] w-2 rounded bg-blue-400/70" />
                  <div className="h-[45%] w-2 rounded bg-blue-300/70" />
                  <div className="h-[80%] w-2 rounded bg-blue-500/70" />
                  <div className="h-[55%] w-2 rounded bg-blue-400/70" />
                  <div className="h-[90%] w-2 rounded bg-blue-600/70" />
                </div>
              </div>
            </div>

            {/* alerts card */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 p-5">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 rounded bg-slate-200" />
                <div className="h-8 w-14 rounded-full bg-blue-50 ring-1 ring-blue-100" />
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-3 py-2">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="h-3 w-10 rounded bg-amber-200/70" />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 ring-1 ring-slate-200/60 px-3 py-2">
                  <div className="h-3 w-28 rounded bg-slate-200" />
                  <div className="h-3 w-10 rounded bg-emerald-200/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PosLayer() {
  return (
    <div className="relative rounded-[2rem] bg-gradient-to-b from-[#1f3b74] to-[#0b1c3f] shadow-[0_22px_60px_rgba(15,23,42,0.28)] ring-1 ring-white/10 overflow-hidden">
      <div className="p-5">
        {/* header */}
        <div className="rounded-2xl bg-white/10 ring-1 ring-white/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-white/20" />
            <div className="h-7 w-14 rounded-full bg-white/10 ring-1 ring-white/10" />
          </div>
        </div>

        {/* product tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/10 ring-1 ring-white/10" />
          ))}
        </div>

        {/* actions */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="h-9 rounded-xl bg-emerald-400/20 ring-1 ring-emerald-300/20" />
          <div className="h-9 rounded-xl bg-amber-400/20 ring-1 ring-amber-300/20" />
          <div className="h-9 rounded-xl bg-sky-400/20 ring-1 ring-sky-300/20" />
        </div>
      </div>
    </div>
  );
}

function AiOverlay() {
  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-[0_18px_55px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 px-4 py-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm ring-1 ring-blue-400/20 grid place-items-center">
          <Brain className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-wide text-slate-900">AI Insight</div>
          <div className="mt-1 h-2.5 w-40 rounded bg-slate-200/80" />
          <div className="mt-2 h-2.5 w-28 rounded bg-slate-200/70" />
        </div>
      </div>
    </div>
  );
}

export default function HeroSystemScene() {
  return (
    <div className="relative w-full max-w-[620px] mx-auto lg:mx-0">
      {/* soft glow */}
      <div className="absolute -inset-10 rounded-[3rem] bg-[radial-gradient(circle_at_30%_35%,rgba(59,130,246,0.20),transparent_60%),radial-gradient(circle_at_70%_60%,rgba(99,102,241,0.18),transparent_55%)] blur-2xl pointer-events-none" />

      {/* dashboard back layer */}
      <div className="relative ml-10 sm:ml-14">
        <DashboardLayer />
      </div>

      {/* POS front layer */}
      <div className="absolute left-0 bottom-[-8px] sm:bottom-[-12px] w-[220px] sm:w-[260px]">
        <PosLayer />
      </div>

      {/* AI overlay */}
      <div className="absolute right-2 sm:right-4 top-10 sm:top-12 w-[210px] sm:w-[240px] hidden sm:block">
        <AiOverlay />
      </div>

      {/* Mobile: small AI overlay below */}
      <div className="mt-4 sm:hidden">
        <AiOverlay />
      </div>
    </div>
  );
}

