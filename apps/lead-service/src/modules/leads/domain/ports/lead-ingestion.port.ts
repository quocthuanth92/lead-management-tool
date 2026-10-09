import { LeadSource } from '@lead/shared-contracts';

export interface LeadIngestionInput {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}

export type LeadIngestionResult =
  | { duplicate: true }
  | { duplicate: false; id: string; userId?: string };

export interface LeadIngestionPort {
  ingest(
    input: LeadIngestionInput,
    context: { source: LeadSource; externalEventId?: string }
  ): Promise<LeadIngestionResult>;
}

export const LEAD_INGESTION_PORT = Symbol('LEAD_INGESTION_PORT');
