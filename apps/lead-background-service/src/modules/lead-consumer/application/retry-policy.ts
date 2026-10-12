export interface ConsumerRetryOptions {
  attempts: number;
  baseDelayMs: number;
}

export class ConsumerRetryPolicy {
  constructor(
    private readonly options: ConsumerRetryOptions,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep
  ) {}

  get maxAttempts(): number {
    return this.options.attempts;
  }

  async waitBeforeRetry(failedAttempt: number): Promise<void> {
    await this.sleep(this.delayAfterAttempt(failedAttempt));
  }

  delayAfterAttempt(failedAttempt: number): number {
    return this.options.baseDelayMs * 2 ** (failedAttempt - 1);
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
