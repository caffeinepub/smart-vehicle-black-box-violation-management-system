import { Link, useRouterState } from '@tanstack/react-router';

export default function PortalNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/violations', label: 'Live Violations' },
    { path: '/vehicle-details', label: 'Vehicle Details' },
    { path: '/challan-preview', label: 'Challan Preview' },
  ];

  return (
    <nav className="bg-gov-blue-dark">
      <div className="container mx-auto px-4">
        <ul className="flex flex-wrap gap-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`block px-6 py-3 text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? 'bg-white text-gov-blue'
                    : 'text-white hover:bg-gov-blue-hover'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
