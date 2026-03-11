import { FileX } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      className="border p-12 text-center rounded-lg"
      style={{ borderColor: "#e2e8f0", backgroundColor: "#f5f7fb" }}
    >
      <FileX className="w-12 h-12 mx-auto mb-4" style={{ color: "#9ca3af" }} />
      <p className="text-lg" style={{ color: "#374151" }}>
        {message}
      </p>
    </div>
  );
}
