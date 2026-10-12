export interface WaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export async function waitUntil<T>(
  probe: () => Promise<T | undefined>,
  description: string,
  { timeoutMs = 30_000, intervalMs = 500 }: WaitOptions = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
