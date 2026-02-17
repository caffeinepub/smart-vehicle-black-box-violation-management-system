import { ReactNode } from 'react';
import PortalNav from './PortalNav';
import PopupNotifications from './notifications/PopupNotifications';

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const currentYear = new Date().getFullYear();
  const appIdentifier = typeof window !== 'undefined' 
    ? encodeURIComponent(window.location.hostname) 
    : 'vehicle-blackbox';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-gov-blue text-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Smart Vehicle Black Box System</h1>
          <p className="text-sm text-gov-blue-light mt-1">Ministry of Road Transport & Highways</p>
        </div>
        <PortalNav />
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      <footer className="bg-gov-blue-dark text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>
            © {currentYear}. Built with love using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gov-blue-light"
            >
              caffeine.ai
            </a>
          </p>
          <p className="mt-2 text-gov-blue-light">Government of India | National Informatics Centre</p>
        </div>
      </footer>
      <PopupNotifications />
    </div>
  );
}
