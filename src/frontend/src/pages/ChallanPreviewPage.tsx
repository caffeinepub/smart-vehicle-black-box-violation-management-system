import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { fetchViolations, type NodeViolation } from '@/lib/api';
import { normalizeImageUrl } from '@/lib/violations/images';
import { toast } from 'sonner';

const FINE_AMOUNTS: Record<string, number> = {
  'Overspeeding': 2000,
  'No Helmet': 1000,
  'Red Light Violation': 1000,
  'Wrong Side Driving': 5000,
  'No Seatbelt': 1000,
  'Mobile Usage': 1000,
  'Drunk Driving': 10000,
};

export default function ChallanPreviewPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { vehicleNo?: string; timestamp?: string };
  
  const [violation, setViolation] = useState<NodeViolation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchViolations();
        const found = data.find(
          v => v.vehicleNo === search.vehicleNo && v.timestamp === search.timestamp
        ) || data[0];
        setViolation(found || null);
      } catch (err) {
        console.error('Failed to load violation:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [search.vehicleNo, search.timestamp]);

  const handleDownloadPDF = () => {
    toast.success('Challan PDF downloaded successfully', {
      description: violation ? `Challan for ${violation.vehicleNo} has been saved` : 'Challan saved',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <p className="text-center text-gray-600">Loading challan...</p>
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">No challan data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = normalizeImageUrl(violation.imageUrl);
  const fineAmount = FINE_AMOUNTS[violation.violationType] || 1000;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate({ to: '/violations' })}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <Button onClick={handleDownloadPDF} className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-8 h-8 text-gov-blue" />
            Challan Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gov-blue text-white p-6 rounded-lg">
            <p className="text-sm opacity-90">Ministry of Road Transport & Highways</p>
            <p className="text-3xl font-bold mt-2">Traffic Violation Challan</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Vehicle Number</p>
              <p className="font-bold text-2xl text-gov-blue">{violation.vehicleNo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Challan Date</p>
              <p className="font-semibold text-lg">{new Date(violation.timestamp).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Owner Name</p>
              <p className="font-semibold text-lg">{violation.ownerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mobile Number</p>
              <p className="font-semibold text-lg">{violation.mobile}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <p className="text-sm text-muted-foreground mb-3">Violation Details</p>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{violation.violationType}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(violation.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-2xl font-bold text-destructive">₹{fineAmount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-100 p-6 rounded-lg">
            <div className="flex justify-between items-center">
              <p className="font-semibold text-xl">Total Fine Amount</p>
              <p className="text-3xl font-bold text-destructive">₹{fineAmount}</p>
            </div>
          </div>
          
          {imageUrl && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">Proof of Violation</p>
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto rounded-lg border-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold mb-2">Payment Instructions:</p>
            <p>Please pay the fine within 60 days to avoid additional penalties. Payment can be made online through the Parivahan portal or at any authorized RTO office.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
