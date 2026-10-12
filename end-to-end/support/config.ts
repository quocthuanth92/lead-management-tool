import 'dotenv/config';

export type AccountLabel = 'A' | 'B';

export interface SalespersonCredentials {
  label: AccountLabel;
  email: string;
  password: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required E2E environment variable ${name} (see end-to-end/.env.example)`
    );
  }
  return value;
}

export const config = {
  webBaseUrl: process.env.E2E_WEB_URL ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000',
  apiBaseUrl: process.env.E2E_SERVICE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3001',
  headless: (process.env.HEADLESS ?? 'true') !== 'false',
  kafkaBrokers: (process.env.E2E_KAFKA_BROKERS ?? '127.0.0.1:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean),
  ingestTopic: process.env.E2E_KAFKA_TOPIC ?? 'leads.incoming',
  deadLetterTopic: process.env.E2E_KAFKA_DLQ_TOPIC ?? 'leads.incoming.dlq'
};

export function getLeadApiKey(): string {
  return requireEnv('E2E_LEAD_API_KEY');
}

export function getSalespersonCredentials(label: AccountLabel): SalespersonCredentials {
  const password = requireEnv('E2E_USER_PASSWORD');
  const email = requireEnv(label === 'A' ? 'E2E_USER_A_EMAIL' : 'E2E_USER_B_EMAIL');
  return { label, email, password };
}

export function otherSalesperson(account: SalespersonCredentials): SalespersonCredentials {
  return getSalespersonCredentials(account.label === 'A' ? 'B' : 'A');
}
