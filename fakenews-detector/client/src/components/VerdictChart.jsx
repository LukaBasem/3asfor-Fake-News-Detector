import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { getVerdictConfig } from "../utils/verdictUtils";

const COLORS = {
  TRUE: "#10b981",
  FALSE: "#ef4444",
  UNVERIFIED: "#eab308",
  MISLEADING: "#f97316",
  MIXED: "#a855f7",
};

export function ConfidenceRadial({ value }) {
  const data = [{ value, fill: value >= 70 ? "#10b981" : value >= 40 ? "#eab308" : "#ef4444" }];

  return (
    <div className="relative w-32 h-32">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="90%"
          startAngle={90}
          endAngle={-270}
          data={[{ value: 100, fill: "#1e293b" }, ...data]}
          barSize={8}
        >
          <RadialBar dataKey="value" cornerRadius={8} background={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white font-mono">{value}%</span>
        <span className="text-xs text-slate-500">confidence</span>
      </div>
    </div>
  );
}

export function ClaimsPieChart({ claims }) {
  const counts = claims.reduce((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts).map(([verdict, count]) => ({
    name: getVerdictConfig(verdict).label,
    value: count,
    verdict,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.verdict} fill={COLORS[entry.verdict] || "#64748b"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#e2e8f0",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
