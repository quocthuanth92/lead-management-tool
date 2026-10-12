import type { LeadSource } from '@lead/shared-contracts';

export const LEAD_INGESTION_PORT = Symbol('LEAD_INGESTION_PORT');

export interface ExternalLeadDraft {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}

export interface IngestExternalLeadCommand {
  source: Extract<LeadSource, 'EXTERNAL'>;
  externalEventId: string;
  lead: ExternalLeadDraft;
}

export type IngestLeadResult =
  | { status: 'CREATED'; leadId: string; assigneeId?: string }
  | { status: 'DUPLICATE' };

export interface LeadIngestionPort {
  ingest(command: IngestExternalLeadCommand): Promise<IngestLeadResult>;
}
