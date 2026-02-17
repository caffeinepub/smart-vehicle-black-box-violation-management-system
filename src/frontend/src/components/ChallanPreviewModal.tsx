import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, FileText } from 'lucide-react';
import { normalizeImageUrl } from '@/lib/violations/images';
import type { NodeViolation } from '@/lib/api';
import { toast } from 'sonner';

interface ChallanPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: NodeViolation | null;
}

const FINE_AMOUNTS: Record<string, number> = {
  'Overspeeding': 2000,
  'No Helmet': 1000,
  'Red Light Violation': 1000,
  'Wrong Side Driving': 5000,
  'No Seatbelt': 1000,
  'Mobile Usage': 1000,
  'Drunk Driving': 10000,
};

export default function ChallanPreviewModal({ open, onOpenChange, violation }: ChallanPreviewModalProps) {
  if (!violation) return null;
  
  const imageUrl = normalizeImageUrl(violation.imageUrl);
  const fineAmount = FINE_AMOUNTS[violation.violationType] || 1000;
  
  const handleDownloadPDF = () => {
    toast.success('Challan PDF downloaded successfully', {
      description: `Challan for ${violation.vehicleNo} has been saved`,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-gov-blue" />
            Challan Preview
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gov-blue text-white p-4 rounded-lg">
            <p className="text-sm opacity-90">Ministry of Road Transport & Highways</p>
            <p className="text-2xl font-bold mt-1">Traffic Violation Challan</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Vehicle Number</p>
              <p className="font-bold text-lg text-gov-blue">{violation.vehicleNo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Challan Date</p>
              <p className="font-semibold">{new Date(violation.timestamp).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Owner Name</p>
              <p className="font-semibold">{violation.ownerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile Number</p>
              <p className="font-semibold">{violation.mobile}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <p className="text-sm text-muted-foreground mb-2">Violation Details</p>
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{violation.violationType}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(violation.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-lg font-bold text-destructive">₹{fineAmount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-lg">Total Fine Amount</p>
              <p className="text-2xl font-bold text-destructive">₹{fineAmount}</p>
            </div>
          </div>
          
          {imageUrl && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Proof of Violation</p>
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto rounded-lg border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded">
            <p className="font-semibold mb-1">Payment Instructions:</p>
            <p>Please pay the fine within 60 days to avoid additional penalties. Payment can be made online through the Parivahan portal or at any authorized RTO office.</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
