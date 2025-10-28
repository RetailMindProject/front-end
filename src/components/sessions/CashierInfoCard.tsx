import { User2 } from "lucide-react";
import Card from "./primitives/Card";
import Header from "./primitives/Header";
import Row from "./primitives/Row";
import KPI from "./primitives/KPI";

type Cashier = { id: string; name: string; role: string; phone: string; email: string };
type Totals = { cashIn: number; cardIn: number };

export default function CashierInfoCard({
  cashier,
  totals,
  fmtMoney,
}: {
  cashier: Cashier | null;
  totals: Totals | null;
  fmtMoney: (n: number) => string;
}) {
  return (
    <Card className="xl:col-span-1">
      <Header icon={<User2 className="h-5 w-5" />} title="Cashier Info" />
      {cashier ? (
        <div>
          <Row label="Name" value={cashier.name} />
          <Row label="Role" value={cashier.role} />
          <Row label="Phone" value={cashier.phone} />
          <Row label="Email" value={cashier.email} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <KPI label="Cash In" value={fmtMoney(totals?.cashIn ?? 0)} />
            <KPI label="Card In" value={fmtMoney(totals?.cardIn ?? 0)} />
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No cashier assigned. Start a new session.</p>
      )}
    </Card>
  );
}
