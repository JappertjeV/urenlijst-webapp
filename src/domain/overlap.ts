export type TimeBlock = {
  id?: string;
  startMinutes: number;
  endMinutes: number;
};

export const OVERLAP_MESSAGE =
  "Dit urenblok overlapt met een bestaand blok op deze dag.";

// Twee blokken overlappen als start < ander.eind && ander.start < eind.
// Blokken die elkaar precies raken (eind == start) zijn toegestaan.
// `excludeId` slaat het blok zelf over bij bewerken.
export function findOverlap(
  candidate: { startMinutes: number; endMinutes: number },
  existing: TimeBlock[],
  excludeId?: string,
): TimeBlock | null {
  for (const block of existing) {
    if (excludeId !== undefined && block.id === excludeId) continue;
    if (
      candidate.startMinutes < block.endMinutes &&
      block.startMinutes < candidate.endMinutes
    ) {
      return block;
    }
  }
  return null;
}
