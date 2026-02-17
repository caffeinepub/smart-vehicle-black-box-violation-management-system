import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { fetchViolations, type NodeViolation } from '@/lib/api';
import { useNavigate } from '@tanstack/react-router';

export default function ChallanManagementPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const data = await fetchViolations();
        setViolations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Group violations by vehicle
  const vehicleGroups = violations.reduce((acc, violation) => {
    if (!acc[violation.vehicleNo]) {
      acc[violation.vehicleNo] = [];
    }
    acc[violation.vehicleNo].push(violation);
    return acc;
  }, {} as Record<string, NodeViolation[]>);

  const FINE_AMOUNTS: Record<string, number> = {
    'Overspeeding': 2000,
    'No Helmet': 1000,
    'Red Light Violation': 1000,
    'Wrong Side Driving': 5000,
    'No Seatbelt': 1000,
    'Mobile Usage': 1000,
    'Drunk Driving': 10000,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-gov-blue pl-6">
          <h1 className="text-3xl font-bold text-gov-blue mb-2">Challan Management</h1>
          <p className="text-gray-700">View and manage traffic challans</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gov-blue animate-spin" />
          <span className="ml-3 text-gray-600">Loading challans...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-gov-blue pl-6">
          <h1 className="text-3xl font-bold text-gov-blue mb-2">Challan Management</h1>
          <p className="text-gray-700">View and manage traffic challans</p>
        </div>
        <div className="bg-red-50 border border-red-300 p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Challans</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-gov-blue pl-6">
        <h1 className="text-3xl font-bold text-gov-blue mb-2">Challan Management</h1>
        <p className="text-gray-700">View and manage traffic challans by vehicle</p>
      </div>

      {Object.keys(vehicleGroups).length === 0 ? (
        <EmptyState message="No challans recorded yet" />
      ) : (
        <div className="space-y-6">
          {Object.entries(vehicleGroups).map(([vehicleNo, vehicleViolations]) => {
            const totalFine = vehicleViolations.reduce(
              (sum, v) => sum + (FINE_AMOUNTS[v.violationType] || 1000),
              0
            );
            const totalScore = vehicleViolations.reduce((sum, v) => sum + v.score, 0);
            const latestViolation = vehicleViolations[0];

            return (
              <Card key={vehicleNo} className="border-2">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-gov-blue" />
                      <div>
                        <p className="text-2xl font-bold text-gov-blue">{vehicleNo}</p>
                        <p className="text-sm font-normal text-muted-foreground">
                          Owner: {latestViolation.ownerName} | Mobile: {latestViolation.mobile}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Fine</p>
                      <p className="text-3xl font-bold text-destructive">₹{totalFine.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">Score: {totalScore}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Violations ({vehicleViolations.length})</h4>
                    <div className="space-y-2">
                      {vehicleViolations.map((violation, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{violation.violationType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(violation.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-destructive">
                              ₹{(FINE_AMOUNTS[violation.violationType] || 1000).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Score: {violation.score}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() =>
                        navigate({
                          to: '/challan-preview',
                          search: {
                            vehicleNo: vehicleNo,
                            timestamp: vehicleViolations[0].timestamp,
                          },
                        })
                      }
                      className="flex-1"
                    >
                      View Challan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate({ to: '/vehicle-details', search: { vehicleNo } })}
                      className="flex-1"
                    >
                      Vehicle Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
