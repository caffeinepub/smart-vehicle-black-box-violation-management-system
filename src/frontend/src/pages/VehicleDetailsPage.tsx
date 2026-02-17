import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Car, User, Phone, AlertTriangle } from 'lucide-react';
import { fetchViolations, type NodeViolation } from '@/lib/api';
import { normalizeImageUrl } from '@/lib/violations/images';

export default function VehicleDetailsPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { vehicleNo?: string };
  const vehicleNo = search.vehicleNo;
  
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchViolations();
        const filtered = vehicleNo 
          ? data.filter(v => v.vehicleNo === vehicleNo)
          : data;
        setViolations(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [vehicleNo]);

  const vehicleInfo = violations.length > 0 ? violations[0] : null;
  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <p className="text-center text-gray-600">Loading vehicle details...</p>
      </div>
    );
  }

  if (error || !vehicleInfo) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              {error || 'No vehicle data available'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Violations
      </Button>

      <div className="border-l-4 border-gov-blue pl-6">
        <h1 className="text-3xl font-bold text-gov-blue mb-2">Vehicle Details</h1>
        <p className="text-gray-700">Complete violation history and owner information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-6 h-6 text-gov-blue" />
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Vehicle Number</p>
              <p className="text-2xl font-bold text-gov-blue">{vehicleInfo.vehicleNo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Owner Name
              </p>
              <p className="text-lg font-semibold">{vehicleInfo.ownerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Mobile Number
              </p>
              <p className="text-lg font-semibold">{vehicleInfo.mobile}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              Violation History
            </span>
            <Badge variant={totalScore >= 5 ? 'destructive' : 'default'} className="text-lg px-4 py-1">
              Total Score: {totalScore}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Date & Time</TableHead>
                <TableHead className="font-semibold">Violation Type</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map((violation, index) => {
                const imageUrl = normalizeImageUrl(violation.imageUrl);
                return (
                  <TableRow key={index}>
                    <TableCell>{new Date(violation.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{violation.violationType}</TableCell>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
