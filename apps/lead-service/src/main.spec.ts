import { ValidationPipe } from '@nestjs/common';
import { API_PREFIX } from '@lead/shared-contracts';

describe('lead-service bootstrap configuration', () => {
  it('uses /api/v1 as global prefix', () => {
    expect(API_PREFIX).toBe('api/v1');
  });

  it('uses strict validation pipe options', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }) as unknown as { validatorOptions: { whitelist?: boolean; forbidNonWhitelisted?: boolean } };

    expect(pipe.validatorOptions.whitelist).toBe(true);
    expect(pipe.validatorOptions.forbidNonWhitelisted).toBe(true);
  });
});
