import { Camera } from 'lucide-react';

interface EvidenceSectionProps {
  driverCameraUrl?: string;
  roadCameraUrl?: string;
}

export default function EvidenceSection({ driverCameraUrl, roadCameraUrl }: EvidenceSectionProps) {
  const hasEvidence = driverCameraUrl || roadCameraUrl;

  if (!hasEvidence) {
    return (
      <div className="bg-gray-50 border border-gray-300 p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Violation Evidence</h4>
        <p className="text-gray-600 text-sm">No evidence available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-300 p-4">
      <h4 className="font-semibold text-gray-900 mb-4">Violation Evidence</h4>
      <div className="grid md:grid-cols-2 gap-4">
        {driverCameraUrl && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-gov-blue" />
              <p className="font-medium text-gray-900">Driver Camera</p>
            </div>
            <img
              src={driverCameraUrl}
              alt="Driver Camera Evidence"
              className="w-full border border-gray-300"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%236b7280" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}
        {roadCameraUrl && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-gov-blue" />
              <p className="font-medium text-gray-900">Road Camera</p>
            </div>
            <img
              src={roadCameraUrl}
              alt="Road Camera Evidence"
              className="w-full border border-gray-300"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%236b7280" font-size="14"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
