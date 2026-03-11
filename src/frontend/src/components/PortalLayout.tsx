import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import PortalNav from "./PortalNav";
import PopupNotifications from "./notifications/PopupNotifications";

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const currentYear = new Date().getFullYear();
  const appIdentifier =
    typeof window !== "undefined"
      ? encodeURIComponent(window.location.hostname)
      : "vehicle-blackbox";

  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dd = now.getDate().toString().padStart(2, "0");
      const mm = (now.getMonth() + 1).toString().padStart(2, "0");
      const yyyy = now.getFullYear();
      const hh = now.getHours().toString().padStart(2, "0");
      const min = now.getMinutes().toString().padStart(2, "0");
      const ss = now.getSeconds().toString().padStart(2, "0");
      setCurrentTime(`${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#f5f7fb" }}
    >
      {/* India Tricolor Strip */}
      <div className="flex h-1.5">
        <div className="flex-1" style={{ backgroundColor: "#FF9933" }} />
        <div className="flex-1" style={{ backgroundColor: "#ffffff" }} />
        <div className="flex-1" style={{ backgroundColor: "#138808" }} />
      </div>

      {/* Header */}
      <header
        className="text-white shadow-lg"
        style={{
          background: "linear-gradient(90deg, #1e3a8a, #2563eb)",
          borderBottom: "3px solid #1e3a8a",
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* SAFEWAY Logo */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <img
                src="/assets/generated/safeway-logo-transparent.dim_120x140.png"
                alt="SAFEWAY Logo"
                className="object-contain"
                style={{ width: "64px", height: "72px" }}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                }}
              />
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#bfdbfe", letterSpacing: "0.12em" }}
              >
                Government of India &nbsp;·&nbsp; Ministry of Road Transport
                &amp; Highways
              </p>
              <h1
                className="text-lg md:text-2xl font-extrabold leading-tight"
                style={{ color: "#ffffff", letterSpacing: "-0.01em" }}
              >
                Motor Vehicle Department –{" "}
                <span style={{ color: "#fbbf24" }}>
                  Smart Violation Monitoring System
                </span>
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="px-3 py-1 text-xs font-bold uppercase tracking-widest border"
                  style={{
                    color: "#e5e7eb",
                    borderColor: "rgba(255,255,255,0.5)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  Drive Safe Plus
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#e5e7eb" }}
                >
                  Enforcement System
                </span>
              </div>
              <p
                className="text-xs mt-1.5"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Cooperated with Kerala Motor Vehicle Department
              </p>
            </div>

            {/* Live indicator + clock */}
            <div className="hidden lg:flex flex-shrink-0 flex-col items-end gap-1.5">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: "#86efac",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="text-xs font-bold uppercase tracking-widest text-white">
                  LIVE
                </span>
              </div>
              {currentTime && (
                <div
                  className="text-xs font-mono text-right"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {currentTime}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <PortalNav />
      </header>

      {/* Main content */}
      <main
        className="flex-1 container mx-auto px-4 py-6"
        style={{ backgroundColor: "#f5f7fb" }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        className="py-6 mt-8 border-t"
        style={{
          backgroundColor: "#f8fafc",
          borderColor: "#e2e8f0",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: branding */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/safeway-logo-transparent.dim_120x140.png"
                alt="SAFEWAY"
                className="object-contain opacity-60"
                style={{ width: "28px", height: "32px" }}
              />
              <div>
                <p className="text-xs font-bold" style={{ color: "#374151" }}>
                  SAFEWAY Smart Vehicle Blackbox Monitoring System
                </p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  Cooperated with Kerala Motor Vehicle Department
                </p>
              </div>
            </div>

            {/* Right: caffeine credit */}
            <div className="text-xs" style={{ color: "#9ca3af" }}>
              © {currentYear}. Built with{" "}
              <span style={{ color: "#ef4444" }}>♥</span> using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 transition-colors"
                style={{ color: "#6b7280" }}
              >
                caffeine.ai
              </a>
            </div>
          </div>
        </div>
      </footer>

      <PopupNotifications />
    </div>
  );
}
