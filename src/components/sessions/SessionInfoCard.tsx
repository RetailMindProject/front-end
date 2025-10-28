import { ReceiptText, Banknote, CreditCard } from "lucide-react";
import Card from "./primitives/Card";
import Header from "./primitives/Header";
import Row from "./primitives/Row";

type Active = {
  totals: { cashIn: number; cardIn: number };
};
type Tx = { id: string; amount: number; method: "CASH" | "CARD"; time: string };

export default function SessionInfoCard({
  active,
  duration,
  variance,
  transactions,
  fmtMoney,
}: {
  active: Active | null;
  duration: string;
  variance: number;
  transactions: Tx[];
  fmtMoney: (n: number) => string;
}) {
  return (
    <Card className="xl:col-span-1">
      <Header icon={<ReceiptText className="h-5 w-5" />} title="Session Info" />
      {active ? (
        <div>
          <Row label="Duration" value={duration} />
          <Row label="Cash vs Card" value={`${fmtMoney(active.totals.cashIn)} / ${fmtMoney(active.totals.cardIn)}`} />
          <Row label="Variance" value={`${variance >= 0 ? "+" : ""}${fmtMoney(variance)}`} />

          <div className="mt-3 rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-3 py-2 text-sm text-gray-600 bg-gray-50">Recent Transactions</div>
            <ul className="divide-y divide-gray-200">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-gray-900">{t.id}</span>
                  <span className="text-gray-600">{t.time}</span>
                  <span className="inline-flex items-center gap-1 text-gray-900">
                    {t.method === "CASH" ? <Banknote className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} {fmtMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No session data available.</p>
      )}
    </Card>
  );
}
