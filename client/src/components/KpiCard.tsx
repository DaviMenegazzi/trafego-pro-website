import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "blue" | "green" | "purple" | "orange" | "red";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const accentColors = {
  blue: "bg-blue-500/10 text-blue-600 border-blue-200",
  green: "bg-green-500/10 text-green-600 border-green-200",
  purple: "bg-purple-500/10 text-purple-600 border-purple-200",
  orange: "bg-orange-500/10 text-orange-600 border-orange-200",
  red: "bg-red-500/10 text-red-600 border-red-200",
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  accent = "blue",
  trend,
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg border ${accentColors[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>

        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% vs. período anterior
          </div>
        )}
      </div>
    </div>
  );
}
