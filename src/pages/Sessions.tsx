import React, { useMemo, useState } from "react";
import { SessionActiveCard, CashierInfoCard, SessionInfoCard, Modal } from "../components";

// --------------------
// Mock Data
// --------------------
const mockActive = {
  sessionId: "S-2025-10-28-A",
  cashier: { id: "U123", name: "Moath Saleh", role: "CASHIER", phone: "059-123-4567", email: "moath@retailmind.com" },
  openedAt: "2025-10-28T09:05:00",
  openingFloat: 200,
  totals: { sales: 1750, orders: 65, cashIn: 980, cardIn: 770, cashOut: 50 },
};

const mockTransactions = [
  { id: "ORD-1290", amount: 59, method: "CASH" as const, time: "10:14" },
  { id: "ORD-1291", amount: 120, method: "CARD" as const, time: "10:22" },
  { id: "ORD-1292", amount: 39, method: "CASH" as const, time: "10:40" },
  { id: "ORD-1293", amount: 220, method: "CARD" as const, time: "10:55" },
  { id: "ORD-1294", amount: 75, method: "CASH" as const, time: "11:03" },
];

// --------------------
// Helpers
// --------------------
const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtMoney = (n: number) => fmt.format(n);

function timeSince(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// --------------------
// Page
// --------------------
export default function Sessions() {
  const [active, setActive] = useState<typeof mockActive | null>(mockActive);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  const duration = useMemo(() => (active ? timeSince(active.openedAt) : "-"), [active]);
  const variance = useMemo(() => {
    if (!active) return 0;
    const expected = active.totals.cashIn + active.totals.cardIn; // simplified
    const recorded = active.totals.sales;
    return recorded - expected;
  }, [active]);

  return (
    <div className="p-6 text-gray-800">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Sessions</h1>
      <p className="mb-6 text-slate-600">Mock view — Active Session, Cashier Info, and Session Info.</p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SessionActiveCard
          active={active ? { sessionId: active.sessionId, openedAt: active.openedAt, openingFloat: active.openingFloat, totals: active.totals } : null}
          duration={duration}
          fmtMoney={fmtMoney}
          onEndClick={() => setShowEndModal(true)}
          onDetailsClick={() => alert("View details (mock)")}
          onStartClick={() => setShowStartModal(true)}
        />

        <CashierInfoCard
          cashier={active ? active.cashier : null}
          totals={active ? { cashIn: active.totals.cashIn, cardIn: active.totals.cardIn } : null}
          fmtMoney={fmtMoney}
        />

        <SessionInfoCard
          active={active ? { totals: { cashIn: active.totals.cashIn, cardIn: active.totals.cardIn } } : null}
          duration={duration}
          variance={variance}
          transactions={mockTransactions}
          fmtMoney={fmtMoney}
        />
      </div>

      {/* End Session Modal */}
      {showEndModal && active && (
        <Modal onClose={() => setShowEndModal(false)} title="End Session">
          <p className="text-slate-300">
            Are you sure you want to end the session <b>{active.sessionId}</b>? This will lock new orders for this cashier.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm" onClick={() => setShowEndModal(false)}>Cancel</button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => {
                setShowEndModal(false);
                setActive(null); // mock end
              }}
            >End now</button>
          </div>
        </Modal>
      )}

      {/* Start Session Modal */}
      {showStartModal && (
        <Modal onClose={() => setShowStartModal(false)} title="Start New Session">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Cashier</label>
              <input className="w-full rounded-lg border border-slate-700 bg-[#0b1220] px-3 py-2 text-sm text-white" defaultValue="Moath Saleh" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Opening Float</label>
              <input type="number" min={0} className="w-full rounded-lg border border-slate-700 bg-[#0b1220] px-3 py-2 text-sm text-white" defaultValue={200} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="rounded-lg bg-slate-700 px-4 py-2 text-sm" onClick={() => setShowStartModal(false)}>Cancel</button>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => {
                setShowStartModal(false);
                setActive(mockActive); // mock start
              }}
            >Start</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
