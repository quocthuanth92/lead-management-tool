import { ValidationPipe } from '@nestjs/common';

import { CreateLeadDto } from './create-lead.dto';

describe('CreateLeadDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true
  });
  const transform = (value: unknown) =>
    pipe.transform(value, { type: 'body', metatype: CreateLeadDto });

  it('accepts formatted phone numbers and normalizes them', async () => {
    await expect(
      transform({
        fullName: '  Customer  ',
        phone: '+1 (555) 555-1212',
        message: '  Interested  '
      })
    ).resolves.toMatchObject({
      fullName: 'Customer',
      phone: '+15555551212',
      message: 'Interested'
    });
  });

  it('rejects missing, malformed, out-of-range, and unknown fields', async () => {
    await expect(transform({ phone: '1234567', message: 'hello' })).rejects.toThrow();
    await expect(transform({ fullName: 'Name', message: 'hello' })).rejects.toThrow();
    await expect(transform({ fullName: 'Name', phone: '1234567' })).rejects.toThrow();
    await expect(
      transform({ fullName: 'Name', phone: '123456', message: 'hello' })
    ).rejects.toThrow();
    await expect(
      transform({ fullName: 'Name', phone: '1234567', message: 'hello', unexpected: true })
    ).rejects.toThrow();
    await expect(
      transform({ fullName: 'Name', phone: '1234567', email: 'not-email', message: 'hello' })
    ).rejects.toThrow();
    await expect(
      transform({ fullName: 'n'.repeat(121), phone: '1234567', message: 'hello' })
    ).rejects.toThrow();
    await expect(
      transform({ fullName: 'Name', phone: '1'.repeat(21), message: 'hello' })
    ).rejects.toThrow();
    await expect(
      transform({ fullName: 'Name', phone: '1234567', message: 'm'.repeat(2001) })
    ).rejects.toThrow();
  });
});
