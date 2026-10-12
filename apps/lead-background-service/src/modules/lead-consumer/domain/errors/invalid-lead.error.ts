export class InvalidLeadError extends Error {
  constructor(readonly issues: string[]) {
    super('Lead payload rejected by validation');
    this.name = 'InvalidLeadError';
  }
}
