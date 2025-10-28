import { Clock, Square, Info, Play } from "lucide-react";
import Card from "./primitives/Card";
import Header from "./primitives/Header";
import Row from "./primitives/Row";
import KPI from "./primitives/KPI";

type Active = {
  sessionId: string;
  openedAt: string;
  openingFloat: number;
  totals: { sales: number; orders: number; cashIn: number; cardIn: number; cashOut: number };
};

export default function SessionActiveCard({
  active,
  duration,
  fmtMoney,
  onEndClick,
  onStartClick,
  onDetailsClick,
}: {
  active: Active | null;
  duration: string;
  fmtMoney: (n: number) => string;
  onEndClick: () => void;
  onStartClick: () => void;
  onDetailsClick: () => void;
}) {
  return (
    <Card className="xl:col-span-1">
      <Header icon={<Clock className="h-5 w-5" />} title="Active Session" />
      {active ? (
        <div>
          <Row label="Session ID" value={active.sessionId} />
          <Row label="Started" value={new Date(active.openedAt).toLocaleString()} />
          <Row label="Duration" value={duration} />

          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <KPI label="Opening Float" value={fmtMoney(active.openingFloat)} />
            <KPI label="Sales" value={fmtMoney(active.totals.sales)} />
            <KPI label="Orders" value={active.totals.orders} />
          </div>

          <div className="mt-4 flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200" onClick={onEndClick}>
              <Square className="h-4 w-4" /> End Session
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={onDetailsClick}>
              <Info className="h-4 w-4" /> Details
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
          No active session.
          <div className="mt-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={onStartClick}>
              <Play className="h-4 w-4" /> Start new session
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
