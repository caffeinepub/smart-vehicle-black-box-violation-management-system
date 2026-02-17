import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, User, Phone } from 'lucide-react';
import { normalizeImageUrl } from '@/lib/violations/images';
import type { NodeViolation } from '@/lib/api';

interface LatestViolationCardProps {
  violation: NodeViolation;
  onViewChallan: () => void;
  onViewVehicle: () => void;
}

export default function LatestViolationCard({ violation, onViewChallan, onViewVehicle }: LatestViolationCardProps) {
  const imageUrl = normalizeImageUrl(violation.imageUrl);
  
  return (
    <Card className="border-2 border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-6 h-6" />
          Latest Violation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Vehicle Number</p>
              <p className="text-2xl font-bold text-gov-blue">{violation.vehicleNo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Violation Type</p>
              <Badge variant="destructive" className="text-base px-3 py-1">
                {violation.violationType}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                <p className="text-xl font-semibold text-destructive">{violation.score}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <p className="text-sm font-medium">{new Date(violation.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Owner
              </p>
              <p className="font-medium">{violation.ownerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Mobile
              </p>
              <p className="font-medium">{violation.mobile}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={onViewChallan} size="sm" className="flex-1">
                <FileText className="w-4 h-4 mr-1" />
                View Challan
              </Button>
              <Button onClick={onViewVehicle} variant="outline" size="sm" className="flex-1">
                Vehicle Details
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Proof Image</p>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto rounded-lg border-2 border-gray-300 object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
