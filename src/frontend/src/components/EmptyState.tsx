import { FileX } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="border border-gray-300 bg-gray-50 p-12 text-center">
      <FileX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
}
