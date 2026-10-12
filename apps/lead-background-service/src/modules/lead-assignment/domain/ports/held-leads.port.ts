export const HELD_LEADS_PORT = Symbol('HELD_LEADS_PORT');

export type AssignLeadOutcome = { assigned: true; assigneeId: string } | { assigned: false };

export interface HeldLeadsPort {
  listUnassignedLeadIds(limit: number): Promise<string[]>;
  hasActiveSalespeople(): Promise<boolean>;
  assignLead(leadId: string): Promise<AssignLeadOutcome>;
}
