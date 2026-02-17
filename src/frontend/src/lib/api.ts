interface NodeViolation {
  vehicleNo: string;
  ownerName: string;
  mobile: string;
  violationType: string;
  timestamp: string;
  score: number;
  imageUrl?: string;
}

export type { NodeViolation };

export async function fetchViolations(): Promise<NodeViolation[]> {
  try {
    const response = await fetch('/violations');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Unable to connect to the server');
    }
    throw error;
  }
}

// Legacy function for ChallanManagementPage compatibility
export async function fetchChallans() {
  // Since the backend only provides violations, we return an empty array
  // This page can be updated in the future when challan endpoint is available
  return [];
}
