import 'dotenv/config';

export const config = {
  webBaseUrl: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3001',
  headless: (process.env.HEADLESS ?? 'true') !== 'false'
};
