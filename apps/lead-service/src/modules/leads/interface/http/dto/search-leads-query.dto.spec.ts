import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { SearchLeadsQueryDto } from './search-leads-query.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

function transformQuery(value: Record<string, unknown>): Promise<SearchLeadsQueryDto> {
  return pipe.transform(value, {
    type: 'query',
    metatype: SearchLeadsQueryDto
  }) as Promise<SearchLeadsQueryDto>;
}

describe('SearchLeadsQueryDto', () => {
  it('requires q or label', async () => {
    await expect(transformQuery({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([[{ q: 'a' }], [{ q: 'x'.repeat(101) }], [{ q: 'ok', label: 'spam' }]])(
    'rejects invalid search %p',
    async (value) => {
      await expect(transformQuery(value)).rejects.toBeInstanceOf(BadRequestException);
    }
  );

  it('accepts a term alone, a label alone, or both', async () => {
    await expect(transformQuery({ q: 'jo' })).resolves.toBeDefined();
    await expect(transformQuery({ label: 'SPAM' })).resolves.toBeDefined();
    await expect(transformQuery({ q: 'jo', label: 'POTENTIAL' })).resolves.toBeDefined();
  });
});
