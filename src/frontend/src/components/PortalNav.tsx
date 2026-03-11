import { Link, useRouterState } from "@tanstack/react-router";
import { AlertOctagon, Car, FileText, LayoutDashboard } from "lucide-react";

export default function PortalNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      ocid: "nav.dashboard.link",
    },
    {
      path: "/violations",
      label: "Live Violations",
      icon: AlertOctagon,
      ocid: "nav.violations.link",
    },
    {
      path: "/vehicle-details",
      label: "Vehicle Details",
      icon: Car,
      ocid: "nav.vehicle_details.link",
    },
    {
      path: "/challan-preview",
      label: "Challan Preview",
      icon: FileText,
      ocid: "nav.challan_preview.link",
    },
  ];

  return (
    <nav
      className="border-t"
      style={{
        backgroundColor: "#1e3a8a",
        borderColor: "rgba(255,255,255,0.15)",
      }}
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4">
        <ul className="flex flex-wrap">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  data-ocid={item.ocid}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all duration-150 border-b-2 ${
                    isActive
                      ? "border-white text-white"
                      : "border-transparent hover:border-white/40"
                  }`}
                  style={{
                    color: isActive ? "#ffffff" : "rgba(255,255,255,0.75)",
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
