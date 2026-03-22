import { type NodeViolation, getViolationFine } from "./api";

export const CHALLAN_THRESHOLD = 5;

export const VIOLATION_SCORES: Record<string, number> = {
  Seatbelt: 1,
  "Door Open": 1,
  "Signal Jump": 3,
  Overspeed: 5, // CRITICAL
  OVERSPEED: 5, // CRITICAL - all-caps variant from ESP32
  "Harsh Braking": 3,
  "Alcohol Low": 4,
  "Alcohol High": 5,
  "Drowsy Driving": 5,
  "Harsh Driving": 5,
  Accident: 0,
  Collision: 0,
};

// Inside camera violations (driver behavior)
const INSIDE_CAM_TYPES = [
  "seatbelt",
  "drowsydriving",
  "alcohollow",
  "alcoholhigh",
  "dooropen",
];

export function isInsideCamViolation(violationType: string): boolean {
  return INSIDE_CAM_TYPES.includes(
    violationType.toLowerCase().replace(/[\s_]/g, ""),
  );
}

export function getViolationScore(violationType: string): number {
  return VIOLATION_SCORES[violationType] ?? 1;
}

export interface ViolationGroup {
  groupId: string;
  violations: NodeViolation[];
  totalScore: number;
  totalFine: number;
  isComplete: boolean; // score >= 5 reached
  isPaid: boolean;
}

export function buildViolationGroups(
  violations: NodeViolation[],
  paidGroupIds: Set<string>,
): ViolationGroup[] {
  // Sort chronologically ascending
  const sorted = [...violations].sort((a, b) => {
    const ta =
      typeof a.timestamp === "number"
        ? a.timestamp
        : new Date(a.timestamp).getTime();
    const tb =
      typeof b.timestamp === "number"
        ? b.timestamp
        : new Date(b.timestamp).getTime();
    return ta - tb;
  });

  const groups: ViolationGroup[] = [];
  let current: NodeViolation[] = [];
  let currentScore = 0;
  let groupIndex = 0;

  for (const v of sorted) {
    const score = getViolationScore(v.violationType);
    current.push(v);
    currentScore += score;

    if (currentScore >= CHALLAN_THRESHOLD) {
      const groupId = `group-${groupIndex}`;
      const totalFine = current.reduce(
        (sum, vio) => sum + getViolationFine(vio),
        0,
      );
      groups.push({
        groupId,
        violations: [...current],
        totalScore: currentScore,
        totalFine,
        isComplete: true,
        isPaid: paidGroupIds.has(groupId),
      });
      current = [];
      currentScore = 0;
      groupIndex++;
    }
  }

  // Add incomplete current group
  if (current.length > 0) {
    const groupId = `group-${groupIndex}`;
    const totalFine = current.reduce(
      (sum, vio) => sum + getViolationFine(vio),
      0,
    );
    groups.push({
      groupId,
      violations: [...current],
      totalScore: currentScore,
      totalFine,
      isComplete: false,
      isPaid: false,
    });
  }

  return groups;
}

export function getPaidGroupIds(): Set<string> {
  try {
    const stored = localStorage.getItem("paidViolationGroups");
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function markGroupPaid(groupId: string): void {
  const existing = getPaidGroupIds();
  existing.add(groupId);
  localStorage.setItem("paidViolationGroups", JSON.stringify([...existing]));
}
