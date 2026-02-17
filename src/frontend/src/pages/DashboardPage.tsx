import { AlertCircle, Shield, FileText } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="border-l-4 border-gov-blue pl-6">
        <h1 className="text-3xl font-bold text-gov-blue mb-2">
          Smart Vehicle Black Box System – Live Monitoring
        </h1>
        <p className="text-gray-700 leading-relaxed">
          The Smart Vehicle Black Box System is a comprehensive platform for monitoring vehicle safety,
          tracking traffic violations, and managing challans in real-time. This system helps ensure road
          safety compliance and enables efficient enforcement of traffic regulations across the nation.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <Link to="/violations" className="block">
          <div className="border border-gray-300 p-6 hover:border-gov-blue hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-8 h-8 text-gov-blue" />
              <h2 className="text-xl font-semibold text-gov-blue">Live Violations</h2>
            </div>
            <p className="text-gray-600 text-sm">
              Monitor real-time traffic violations detected by vehicle black box systems across the country.
            </p>
          </div>
        </Link>

        <Link to="/challans" className="block">
          <div className="border border-gray-300 p-6 hover:border-gov-blue hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-gov-blue" />
              <h2 className="text-xl font-semibold text-gov-blue">Challan Management</h2>
            </div>
            <p className="text-gray-600 text-sm">
              View and manage traffic challans, including fine amounts and violation evidence.
            </p>
          </div>
        </Link>

        <div className="border border-gray-300 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-gov-blue" />
            <h2 className="text-xl font-semibold text-gov-blue">Safety Compliance</h2>
          </div>
          <p className="text-gray-600 text-sm">
            Ensuring road safety through continuous monitoring and enforcement of traffic regulations.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-300 p-6 mt-8">
        <h3 className="text-lg font-semibold text-gov-blue mb-3">System Features</h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-gov-blue mt-1">•</span>
            <span>Real-time violation detection and monitoring</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gov-blue mt-1">•</span>
            <span>Automated challan generation and management</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gov-blue mt-1">•</span>
            <span>Evidence capture through driver and road cameras</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gov-blue mt-1">•</span>
            <span>Comprehensive violation tracking and reporting</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
