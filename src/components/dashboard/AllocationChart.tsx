import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationItem } from "@/types/portfolio";

interface AllocationChartProps {
  data: AllocationItem[];
}

export function AllocationChart({ data }: AllocationChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold">Allocation</h3>
        <p className="text-xs text-muted-foreground mt-0.5">By asset type</p>
      </div>
      
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="percentage" strokeWidth={0}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={({ active, payload }) => active && payload?.length ? (
              <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
                <p className="text-xs font-medium">{payload[0].payload.name}</p>
                <p className="text-sm font-semibold">{payload[0].payload.percentage.toFixed(1)}%</p>
              </div>
            ) : null} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground text-xs">{item.name}</span>
            </div>
            <span className="font-mono-numbers text-xs font-medium">{item.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
