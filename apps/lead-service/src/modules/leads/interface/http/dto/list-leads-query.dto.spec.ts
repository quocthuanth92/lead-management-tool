import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { ListLeadsQueryDto } from './list-leads-query.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

function transformQuery<T>(value: Record<string, unknown>, metatype: new () => T): Promise<T> {
  return pipe.transform(value, { type: 'query', metatype }) as Promise<T>;
}

describe('ListLeadsQueryDto', () => {
  it('applies the default page and limit', async () => {
    const query = await transformQuery({}, ListLeadsQueryDto);

    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('converts numeric strings to numbers', async () => {
    const query = await transformQuery({ page: '2', limit: '50' }, ListLeadsQueryDto);

    expect(query.page).toBe(2);
    expect(query.limit).toBe(50);
  });

  it.each([
    [{ page: '0' }],
    [{ limit: '500' }],
    [{ limit: 'abc' }],
    [{ fromDate: 'garbage' }],
    [{ toDate: 'yesterday' }],
    [{ unknown: 'value' }]
  ])('rejects invalid query %p', async (value) => {
    await expect(transformQuery(value, ListLeadsQueryDto)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('accepts ISO dates and date-only values', async () => {
    const query = await transformQuery(
      { fromDate: '2026-01-01', toDate: '2026-01-31T12:00:00.000Z' },
      ListLeadsQueryDto
    );

    expect(query.fromDate).toBe('2026-01-01');
    expect(query.toDate).toBe('2026-01-31T12:00:00.000Z');
  });
});
