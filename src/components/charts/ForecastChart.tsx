import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
} from "recharts";
import type { SalesHistoryPoint, ForecastPoint } from "../../types/forecasting.dto";

interface ForecastChartProps {
  history: SalesHistoryPoint[];
  forecast: ForecastPoint[];
  expectedStockoutDate?: string | null;
}

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

export default function ForecastChart({
  history,
  forecast,
  expectedStockoutDate,
}: ForecastChartProps) {
  // Combine history and forecast data
  const historyData = (history || []).map((point) => ({
    date: point.ds,
    history: point.y,
    forecast: null as number | null,
    forecastLower: null as number | null,
    forecastUpper: null as number | null,
  }));

  const forecastData = (forecast || []).map((point) => ({
    date: point.ds,
    history: null as number | null,
    forecast: point.yhat,
    forecastLower: point.yhat_lower ?? null,
    forecastUpper: point.yhat_upper ?? null,
  }));

  const combinedData = [...historyData, ...forecastData].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (combinedData.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center text-slate-500">
        No data available
      </div>
    );
  }

  const today = getTodayDate();

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#64748b"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
          <Tooltip
            labelFormatter={(value) => formatDate(value as string)}
            formatter={(value: any) => {
              if (value === null || value === undefined) return "—";
              const numValue = typeof value === 'number' ? value : Number(value);
              return isNaN(numValue) ? "—" : numValue.toFixed(2);
            }}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
          />
          <Legend />
          {/* Today reference line */}
          <ReferenceLine
            x={today}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: "Today", position: "top", fill: "#ef4444" }}
          />
          {/* Expected stockout date reference line */}
          {expectedStockoutDate && (
            <ReferenceLine
              x={expectedStockoutDate}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: "Expected Stockout",
                position: "top",
                fill: "#f59e0b",
              }}
            />
          )}
          {/* History line */}
          <Line
            type="monotone"
            dataKey="history"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Historical Sales"
            connectNulls={false}
          />
          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            name="Forecast"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

