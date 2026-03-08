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
      setCurrentTime(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* India tricolor strip at very top */}
      <div className="h-2 w-full flex flex-shrink-0">
        <div className="flex-1" style={{ backgroundColor: "#FF9933" }} />
        <div className="flex-1 bg-white" />
        <div className="flex-1" style={{ backgroundColor: "#138808" }} />
      </div>

      {/* Header */}
      <header
        className="text-white shadow-2xl"
        style={{ backgroundColor: "#0B3D91" }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-5">
            {/* SAFEWAY Logo */}
            <div className="flex-shrink-0">
              <img
                src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
                alt="SAFEWAY Logo"
                className="w-16 h-16 object-contain"
                style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.4))" }}
              />
            </div>

            {/* Divider */}
            <div
              className="hidden md:block w-px self-stretch opacity-30"
              style={{ backgroundColor: "#aad4ff" }}
            />

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{
                  color: "#b3d4ff",
                  fontVariant: "small-caps",
                  letterSpacing: "0.15em",
                }}
              >
                Government of India &nbsp;·&nbsp; Ministry of Road Transport
                &amp; Highways
              </div>
              <h1
                className="text-lg md:text-2xl font-extrabold leading-tight"
                style={{ letterSpacing: "-0.01em" }}
              >
                Motor Vehicle Department –{" "}
                <span style={{ color: "#ffd700" }}>
                  Smart Violation Monitoring System
                </span>
              </h1>
              <div
                className="text-xs mt-1 flex items-center gap-2"
                style={{ color: "#b3d4ff" }}
              >
                <span
                  className="inline-block px-2 py-0.5 font-semibold uppercase tracking-wider text-white border"
                  style={{
                    backgroundColor: "rgba(255,153,51,0.25)",
                    borderColor: "#FF9933",
                    fontSize: "10px",
                    borderRadius: "1px",
                  }}
                >
                  Drive Safe Plus
                </span>
                <span>Enforcement System</span>
              </div>
            </div>

            {/* Live indicator + clock */}
            <div className="hidden lg:flex flex-shrink-0 flex-col items-end gap-1.5">
              <div
                className="flex items-center gap-2 px-3 py-1.5 border"
                style={{
                  backgroundColor: "rgba(0,0,0,0.25)",
                  borderColor: "rgba(255,255,255,0.15)",
                  borderRadius: "2px",
                }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: "#22c55e",
                    boxShadow: "0 0 8px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#4ade80" }}
                >
                  LIVE
                </span>
              </div>
              {currentTime && (
                <div
                  className="text-xs font-mono text-right"
                  style={{ color: "#93c5fd" }}
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
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer
        className="text-white py-6 mt-8 border-t"
        style={{
          backgroundColor: "#082d6b",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Left: branding */}
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
                alt="SAFEWAY"
                className="w-8 h-8 object-contain opacity-80"
              />
              <div>
                <p className="text-xs font-bold text-white">
                  Smart Vehicle Blackbox &amp; Auto-Challan System
                </p>
                <p className="text-xs" style={{ color: "#93c5fd" }}>
                  Government of India · Motor Vehicle Department
                </p>
              </div>
            </div>

            {/* Right: caffeine credit */}
            <div className="text-xs" style={{ color: "#93c5fd" }}>
              © {currentYear}. Built with{" "}
              <span style={{ color: "#f87171" }}>♥</span> using{" "}
              <a
                href={`https://caffeine.ai/?utm_source=caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors"
                style={{ color: "#93c5fd" }}
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
