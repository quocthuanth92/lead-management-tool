import type { DeadLetterEnvelope } from '@lead/shared-contracts';

export const DEAD_LETTER_PORT = Symbol('DEAD_LETTER_PORT');

export interface DeadLetterPort {
  publish(envelope: DeadLetterEnvelope): Promise<void>;
}
