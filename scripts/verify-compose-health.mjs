import { execSync } from 'node:child_process';

const output = execSync('docker compose ps --format json', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const unhealthy = output.filter((service) => service.Health && service.Health !== 'healthy');
if (unhealthy.length > 0) {
  console.error(
    'Unhealthy services detected:',
    unhealthy.map((s) => `${s.Service}:${s.Health}`).join(', ')
  );
  process.exit(1);
}

console.log('All compose services are healthy.');
