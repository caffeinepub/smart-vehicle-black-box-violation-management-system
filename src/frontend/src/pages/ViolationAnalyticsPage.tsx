import { Badge } from "@/components/ui/badge";
import { useInterval } from "@/hooks/useInterval";
import { type NodeViolation, fetchViolations } from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Car,
  CheckCircle2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

function getScoreLabel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score >= 5)
    return {
      label: "Severe Violation",
      color: "#991b1b",
      bg: "#fee2e2",
      border: "#fca5a5",
    };
  if (score === 3)
    return {
      label: "Warning",
      color: "#c2410c",
      bg: "#fff7ed",
      border: "#fdba74",
    };
  return {
    label: "Low Risk",
    color: "#166534",
    bg: "#dcfce7",
    border: "#86efac",
  };
}

export default function ViolationAnalyticsPage() {
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchViolations();
      setViolations(data);
    } catch {
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable
  useEffect(() => {
    loadData();
  }, []);

  useInterval(() => {
    loadData();
  }, 3000);

  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const severeCount = violations.filter((v) => v.score >= 5).length;
  const warningCount = violations.filter((v) => v.score === 3).length;
  const lowRiskCount = violations.filter((v) => v.score === 1).length;

  // Violation type breakdown
  const typeMap: Record<string, number> = {};
  for (const v of violations) {
    const t = v.violationType || "Unknown";
    typeMap[t] = (typeMap[t] || 0) + 1;
  }
  const typeBreakdown = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  // Vehicle score breakdown
  const vehicleScores: Record<string, number> = {};
  for (const v of violations) {
    vehicleScores[v.vehicleNo] = (vehicleScores[v.vehicleNo] || 0) + v.score;
  }
  const topVehicles = Object.entries(vehicleScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const summaryCards = [
    {
      label: "Total Score",
      value: loading ? "—" : String(totalScore),
      icon: TrendingUp,
      accent: totalScore >= 5 ? "#dc2626" : "#0B3D91",
      iconBg: totalScore >= 5 ? "rgba(220,38,38,0.1)" : "rgba(11,61,145,0.1)",
    },
    {
      label: "Severe Violations",
      value: loading ? "—" : String(severeCount),
      icon: AlertTriangle,
      accent: "#dc2626",
      iconBg: "rgba(220,38,38,0.1)",
    },
    {
      label: "Warnings",
      value: loading ? "—" : String(warningCount),
      icon: Activity,
      accent: "#b45309",
      iconBg: "rgba(245,158,11,0.12)",
    },
    {
      label: "Low Risk",
      value: loading ? "—" : String(lowRiskCount),
      icon: CheckCircle2,
      accent: "#166534",
      iconBg: "rgba(22,101,52,0.1)",
    },
  ];

  return (
    <div className="space-y-6" data-ocid="analytics.page">
      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#0B3D91",
          backgroundColor: "rgba(11,61,145,0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" style={{ color: "#0B3D91" }} />
          <h1 className="text-2xl font-extrabold" style={{ color: "#0B3D91" }}>
            Violation Analytics
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Score breakdown and violation statistics — Motor Vehicle Department
          Portal
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-md overflow-hidden"
              style={{ borderLeft: `4px solid ${card.accent}` }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#9ca3af" }}
                  >
                    {card.label}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: card.iconBg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: card.accent }} />
                  </div>
                </div>
                <p
                  className="text-4xl font-black leading-none"
                  style={{ color: card.accent }}
                >
                  {loading ? (
                    <Loader2
                      className="w-6 h-6 animate-spin"
                      style={{ color: card.accent }}
                    />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div
          data-ocid="analytics.loading_state"
          className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200 gap-2 text-gray-400"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading analytics data...</span>
        </div>
      ) : violations.length === 0 ? (
        <div
          data-ocid="analytics.empty_state"
          className="bg-white rounded-xl border border-gray-200 py-14 text-center text-gray-400 text-sm"
        >
          No violation data to analyze yet. System is actively monitoring.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Violation Type Breakdown */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ backgroundColor: "#0B3D91" }}
            >
              <BarChart3 className="w-4 h-4 text-white opacity-80" />
              <span className="text-white font-bold text-sm uppercase tracking-widest">
                Violation Type Breakdown
              </span>
            </div>
            <div className="p-4 space-y-3">
              {typeBreakdown.map(([type, count]) => {
                const pct =
                  violations.length > 0
                    ? Math.round((count / violations.length) * 100)
                    : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {type}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "#0B3D91",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Vehicles by Score */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ backgroundColor: "#0B3D91" }}
            >
              <Car className="w-4 h-4 text-white opacity-80" />
              <span className="text-white font-bold text-sm uppercase tracking-widest">
                Top Vehicles by Score
              </span>
            </div>
            <div className="p-4 space-y-3">
              {topVehicles.length === 0 ? (
                <p className="text-gray-400 text-sm italic text-center py-4">
                  No data
                </p>
              ) : (
                topVehicles.map(([vehicleNo, score], i) => {
                  const scoreInfo = getScoreLabel(score);
                  return (
                    <div
                      key={vehicleNo}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: "#0B3D91" }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="font-mono font-bold text-sm"
                          style={{ color: "#0B3D91" }}
                        >
                          {vehicleNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-black text-sm px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: scoreInfo.bg,
                            color: scoreInfo.color,
                            border: `1px solid ${scoreInfo.border}`,
                          }}
                        >
                          {score} pts
                        </span>
                        <Badge
                          className="text-xs font-semibold"
                          style={{
                            backgroundColor: scoreInfo.bg,
                            color: scoreInfo.color,
                            border: `1px solid ${scoreInfo.border}`,
                            borderRadius: "3px",
                          }}
                        >
                          {scoreInfo.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
