export const ASSIGNMENT_CACHE_INVALIDATOR_PORT = Symbol('ASSIGNMENT_CACHE_INVALIDATOR_PORT');

export interface AssignmentCacheInvalidatorPort {
  invalidateLeadWrite(leadId: string, ownerId: string): Promise<void>;
}
