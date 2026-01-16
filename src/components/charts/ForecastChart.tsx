import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
  Area,
  ComposedChart,
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

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-2xl p-4 min-w-[200px]">
        <p className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">
          {formatDate(label)}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            if (entry.value === null || entry.value === undefined) return null;
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-medium text-slate-600">
                    {entry.name}:
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {typeof entry.value === "number"
                    ? entry.value.toFixed(2)
                    : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Legend Component
const CustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex items-center justify-center gap-6 mt-6">
      {payload?.map((entry: any, index: number) => (
        <div
          key={index}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-slate-200/50 shadow-sm"
        >
          <div
            className="w-4 h-1 rounded-full"
            style={{
              backgroundColor: entry.color,
              borderStyle: entry.payload?.strokeDasharray ? "dashed" : "solid",
            }}
          />
          <span className="text-xs font-semibold text-slate-700">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
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
      <div className="h-96 w-full flex items-center justify-center text-slate-500 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50">
        <div className="text-center">
          <p className="text-sm font-medium">No data available</p>
        </div>
      </div>
    );
  }

  const today = getTodayDate();

  return (
    <div className="w-full relative" style={{ height: "450px" }}>
      {/* Gradient background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-indigo-50/20 to-blue-50/30 rounded-xl pointer-events-none" />
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
        >
          <defs>
            {/* Gradient for historical sales area */}
            <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            
            {/* Gradient for forecast area */}
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
            strokeOpacity={0.5}
          />
          
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#64748b"
            style={{ fontSize: "11px", fontWeight: 600 }}
            tick={{ fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1", strokeWidth: 1.5 }}
            tickLine={{ stroke: "#cbd5e1" }}
          />
          
          <YAxis
            stroke="#64748b"
            style={{ fontSize: "11px", fontWeight: 600 }}
            tick={{ fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1", strokeWidth: 1.5 }}
            tickLine={{ stroke: "#cbd5e1" }}
            width={70}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Historical Sales Area */}
          <Area
            type="monotone"
            dataKey="history"
            stroke="none"
            fill="url(#historyGradient)"
            fillOpacity={1}
          />
          
          {/* Forecast Area */}
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="none"
            fill="url(#forecastGradient)"
            fillOpacity={1}
          />
          
          {/* Today reference line */}
          <ReferenceLine
            x={today}
            stroke="#ef4444"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            label={{
              value: "Today",
              position: "top",
              fill: "#ef4444",
              fontSize: 11,
              fontWeight: 700,
              offset: 10,
            }}
          />
          
          {/* Expected stockout date reference line */}
          {expectedStockoutDate && (
            <ReferenceLine
              x={expectedStockoutDate}
              stroke="#f59e0b"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              label={{
                value: "Expected Stockout",
                position: "top",
                fill: "#f59e0b",
                fontSize: 11,
                fontWeight: 700,
                offset: 10,
              }}
            />
          )}
          
          {/* History line */}
          <Line
            type="monotone"
            dataKey="history"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
            name="Historical Sales"
            connectNulls={false}
          />
          
          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#10b981"
            strokeWidth={3}
            strokeDasharray="8 5"
            dot={false}
            activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
            name="Forecast"
            connectNulls={false}
          />
          
          <Legend content={<CustomLegend />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
