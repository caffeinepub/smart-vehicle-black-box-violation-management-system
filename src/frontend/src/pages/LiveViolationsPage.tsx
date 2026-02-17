import { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import EmptyState from '@/components/EmptyState';
import LatestViolationCard from '@/components/LatestViolationCard';
import ChallanPreviewModal from '@/components/ChallanPreviewModal';
import { fetchViolations, type NodeViolation } from '@/lib/api';
import { useInterval } from '@/hooks/useInterval';
import { normalizeImageUrl } from '@/lib/violations/images';
import { showNotification } from '@/components/notifications/PopupNotifications';
import { useNavigate } from '@tanstack/react-router';

export default function LiveViolationsPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<NodeViolation | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  
  const previousViolationsRef = useRef<Set<string>>(new Set());
  const previousTotalScoreRef = useRef<number>(0);

  const loadViolations = async () => {
    try {
      setError(null);
      const data = await fetchViolations();
      
      // Detect new violations
      const currentViolationKeys = new Set(
        data.map(v => `${v.vehicleNo}-${v.timestamp}`)
      );
      
      const newViolations = data.filter(v => {
        const key = `${v.vehicleNo}-${v.timestamp}`;
        return !previousViolationsRef.current.has(key);
      });
      
      // Show notification for new violations
      if (newViolations.length > 0 && previousViolationsRef.current.size > 0) {
        newViolations.forEach(() => {
          showNotification('Alert sent to owner', 'alert');
        });
      }
      
      // Calculate total score
      const totalScore = data.reduce((sum, v) => sum + v.score, 0);
      
      // Show RTO notification if score threshold crossed
      if (totalScore >= 5 && previousTotalScoreRef.current < 5 && previousViolationsRef.current.size > 0) {
        showNotification('Report sent to 112', 'report');
      }
      
      previousViolationsRef.current = currentViolationKeys;
      previousTotalScoreRef.current = totalScore;
      
      setViolations(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViolations();
  }, []);

  useInterval(() => {
    loadViolations();
  }, 3000);

  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const latestViolation = violations.length > 0 
    ? violations.reduce((latest, current) => 
        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      )
    : null;

  const getStatusBadge = (score: number) => {
    if (score >= 3) return <Badge variant="destructive">Critical</Badge>;
    if (score >= 2) return <Badge variant="default">High</Badge>;
    return <Badge variant="secondary">New</Badge>;
  };

  const handleViewChallan = (violation: NodeViolation) => {
    setSelectedViolation(violation);
    setChallanModalOpen(true);
  };

  const handleViewVehicle = (vehicleNo: string) => {
    navigate({ to: '/vehicle-details', search: { vehicleNo } });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-gov-blue pl-6">
          <h1 className="text-3xl font-bold text-gov-blue mb-2">Live Violations</h1>
          <p className="text-gray-700">Real-time monitoring of traffic violations</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gov-blue animate-spin" />
          <span className="ml-3 text-gray-600">Loading violations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-gov-blue pl-6">
          <h1 className="text-3xl font-bold text-gov-blue mb-2">Live Violations</h1>
          <p className="text-gray-700">Real-time monitoring of traffic violations</p>
        </div>
        <div className="bg-red-50 border border-red-300 p-6 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">Error Loading Violations</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-gov-blue pl-6">
        <h1 className="text-3xl font-bold text-gov-blue mb-2">Live Violations</h1>
        <p className="text-gray-700">Real-time monitoring of traffic violations</p>
      </div>

      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <RefreshCw className="w-4 h-4" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <span className="text-gray-400">• Auto-refreshing every 3 seconds</span>
        </div>
      )}

      {totalScore >= 5 && (
        <Alert variant="destructive" className="border-2">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">MULTIPLE VIOLATIONS — DATA SENT TO RTO</AlertTitle>
          <AlertDescription>
            Total violation score has reached {totalScore} points. Authorities have been notified.
          </AlertDescription>
        </Alert>
      )}

      {violations.length === 0 ? (
        <EmptyState message="No violations recorded yet" />
      ) : (
        <>
          {latestViolation && (
            <LatestViolationCard
              violation={latestViolation}
              onViewChallan={() => handleViewChallan(latestViolation)}
              onViewVehicle={() => handleViewVehicle(latestViolation.vehicleNo)}
            />
          )}

          <div className="border border-gray-300 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold text-gov-blue">Time</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Vehicle No</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Violation Type</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Score</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Proof Image</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Status</TableHead>
                  <TableHead className="font-semibold text-gov-blue">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((violation, index) => {
                  const imageUrl = normalizeImageUrl(violation.imageUrl);
                  return (
                    <TableRow key={`${violation.vehicleNo}-${violation.timestamp}-${index}`} className="hover:bg-gray-50">
                      <TableCell className="text-gray-600">
                        {new Date(violation.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{violation.vehicleNo}</TableCell>
                      <TableCell>{violation.violationType}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-destructive">{violation.score}</span>
                      </TableCell>
                      <TableCell>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Proof"
                            className="w-16 h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(imageUrl, '_blank')}
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect fill="%23f3f4f6" width="64" height="48"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10"%3EN/A%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <span className="text-sm text-gray-500">No image</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(violation.score)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewChallan(violation)}
                        >
                          Challan
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ChallanPreviewModal
        open={challanModalOpen}
        onOpenChange={setChallanModalOpen}
        violation={selectedViolation}
      />
    </div>
  );
}
