import { useInterval } from "@/hooks/useInterval";
import { type NodeViolation, fetchViolations } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Car,
  FileText,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = () => {
    fetchViolations()
      .then((data) => {
        setViolations(data);
        setLastUpdated(new Date());
      })
      .catch(() => setViolations([]))
      .finally(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable (defined in component scope, no deps change between renders)
  useEffect(() => {
    loadData();
  }, []);

  useInterval(() => {
    loadData();
  }, 3000);

  const totalViolations = violations.length;
  const uniqueVehicles = new Set(violations.map((v) => v.vehicleNo)).size;
  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const accidentCount = violations.filter((v) =>
    v.violationType?.toLowerCase().includes("accident"),
  ).length;

  const statCards = [
    {
      label: "Total Violations",
      value: loading ? "—" : String(totalViolations),
      icon: Activity,
      accent: "#0B3D91",
      iconBg: "rgba(11,61,145,0.1)",
      ocid: "dashboard.total_violations.card",
    },
    {
      label: "Vehicles Flagged",
      value: loading ? "—" : String(uniqueVehicles),
      icon: Car,
      accent: "#b45309",
      iconBg: "rgba(245,158,11,0.12)",
      ocid: "dashboard.vehicles_flagged.card",
    },
    {
      label: "Total Score",
      value: loading ? "—" : String(totalScore),
      icon: TrendingUp,
      accent: totalScore >= 5 ? "#dc2626" : "#374151",
      iconBg: totalScore >= 5 ? "rgba(220,38,38,0.1)" : "rgba(107,114,128,0.1)",
      ocid: "dashboard.total_score.card",
    },
    {
      label: "Accident Alerts",
      value: loading ? "—" : String(accidentCount),
      icon: AlertCircle,
      accent: "#dc2626",
      iconBg: "rgba(220,38,38,0.1)",
      ocid: "dashboard.accident_alerts.card",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Multiple Violations Warning Banner */}
      {!loading && totalScore >= 5 && (
        <div
          data-ocid="dashboard.score_alert.panel"
          className="flex items-center gap-3 px-5 py-4 rounded-lg shadow-lg"
          style={{
            background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
            border: "2px solid #ef4444",
            animation: "pulse 2s infinite",
          }}
          role="alert"
        >
          <AlertTriangle
            className="w-6 h-6 flex-shrink-0"
            style={{ color: "#fca5a5" }}
          />
          <div>
            <p className="font-bold text-white text-sm md:text-base leading-tight">
              ⚠ Multiple Violations Detected — Data Forwarded to Authorities
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#fca5a5" }}>
              Total score:{" "}
              <strong className="text-white">{totalScore} pts</strong> — Challan
              auto-generated and forwarded to RTO.
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#0B3D91",
          backgroundColor: "rgba(11,61,145,0.04)",
        }}
      >
        <h1
          className="text-2xl md:text-3xl font-extrabold mb-1"
          style={{ color: "#0B3D91" }}
        >
          Motor Vehicle Department
        </h1>
        <p className="text-gray-500 text-sm font-medium mb-2">
          Smart Violation Monitoring System · Live Monitoring Dashboard
        </p>
        <p className="text-gray-600 leading-relaxed text-sm">
          The Smart Vehicle Blackbox Enforcement System monitors real-time
          traffic violations, generates challans automatically, and forwards
          repeat offenders to RTO authorities. Data updates every 3 seconds.
        </p>
      </div>

      {/* Live Stats */}
      <div>
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            {loading ? (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: "pulse 1s infinite" }}
                />
                <span className="text-gray-500 font-medium">
                  Loading live data...
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: "#22c55e",
                    boxShadow: "0 0 6px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="font-semibold" style={{ color: "#16a34a" }}>
                  Live Feed Active
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 text-xs">
                  Auto-refresh every 3s
                </span>
              </>
            )}
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-400 font-mono">
              Updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          )}
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                data-ocid={card.ocid}
                className="bg-white rounded-xl shadow-lg overflow-hidden relative"
                style={{
                  borderLeft: `4px solid ${card.accent}`,
                  boxShadow:
                    "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div className="p-5">
                  {/* Icon badge top-right */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#9ca3af", letterSpacing: "0.1em" }}
                    >
                      {card.label}
                    </span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: card.iconBg }}
                    >
                      <Icon
                        className="w-4 h-4"
                        style={{ color: card.accent }}
                      />
                    </div>
                  </div>
                  {/* Big number */}
                  <p
                    className="text-4xl font-black leading-none"
                    style={{ color: card.accent }}
                  >
                    {card.value}
                  </p>
                  {/* Colored bottom stripe */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-30"
                    style={{ backgroundColor: card.accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "#6b7280" }}
        >
          Quick Navigation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/violations"
            className="block group"
            data-ocid="dashboard.violations.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <AlertCircle
                    className="w-5 h-5"
                    style={{ color: "#0B3D91" }}
                  />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Live Violations
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Monitor real-time traffic violations detected by vehicle black
                box systems.
              </p>
            </div>
          </Link>

          <Link
            to="/vehicle-details"
            className="block group"
            data-ocid="dashboard.vehicle_details.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <Car className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Vehicle Details
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Look up registered vehicle information and violation history.
              </p>
            </div>
          </Link>

          <Link
            to="/challans"
            className="block group"
            data-ocid="dashboard.challans.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <Shield className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Challan Management
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                View and manage traffic challans, fine amounts, and violation
                evidence.
              </p>
            </div>
          </Link>

          <Link
            to="/challan-preview"
            className="block group"
            data-ocid="dashboard.challan_preview.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <FileText className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Challan Preview
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Preview and download official traffic challan documents.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* System Info */}
      <div
        className="bg-white border-l-4 p-6 rounded-xl shadow-sm"
        style={{ borderLeftColor: "#0B3D91" }}
      >
        <h3
          className="text-sm font-bold uppercase tracking-widest mb-4"
          style={{ color: "#0B3D91" }}
        >
          System Features
        </h3>
        <ul className="space-y-2.5 text-gray-700 text-sm">
          <li className="flex items-start gap-2.5">
            <span
              className="mt-0.5 font-bold flex-shrink-0"
              style={{ color: "#0B3D91" }}
            >
              ▸
            </span>
            <span>
              Real-time violation detection and monitoring from vehicle black
              box hardware
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-0.5 font-bold flex-shrink-0"
              style={{ color: "#0B3D91" }}
            >
              ▸
            </span>
            <span>Automated challan generation with fine calculation</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-0.5 font-bold flex-shrink-0"
              style={{ color: "#0B3D91" }}
            >
              ▸
            </span>
            <span>Evidence capture and proof image display</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-0.5 font-bold flex-shrink-0"
              style={{ color: "#0B3D91" }}
            >
              ▸
            </span>
            <span>
              Multiple violation alert: data forwarded to RTO when score ≥ 5
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span
              className="mt-0.5 font-bold flex-shrink-0"
              style={{ color: "#0B3D91" }}
            >
              ▸
            </span>
            <span>
              Connected to live backend:{" "}
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300">
                vehicle-blackbox-system.onrender.com
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
