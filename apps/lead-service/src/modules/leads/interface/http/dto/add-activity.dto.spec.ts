import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { AddActivityDto } from './add-activity.dto';
import { SetLabelDto } from './set-label.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

function transformBody<T>(value: unknown, metatype: new () => T): Promise<T> {
  return pipe.transform(value, { type: 'body', metatype }) as Promise<T>;
}

describe('SetLabelDto', () => {
  it.each([[{ label: 'SPAM' }], [{ label: 'POTENTIAL' }], [{ label: 'UNLABELED' }]])(
    'accepts a known label %p',
    async (body) => {
      await expect(transformBody(body, SetLabelDto)).resolves.toBeDefined();
    }
  );

  it.each([[{ label: 'spam' }], [{ label: 'VIP' }], [{}], [{ label: 'SPAM', extra: 1 }]])(
    'rejects %p',
    async (body) => {
      await expect(transformBody(body, SetLabelDto)).rejects.toBeInstanceOf(BadRequestException);
    }
  );
});

describe('AddActivityDto', () => {
  it('defaults nothing and accepts a note with an explicit type', async () => {
    const dto = await transformBody({ content: 'Called customer', type: 'CALL' }, AddActivityDto);

    expect(dto.type).toBe('CALL');
    expect(dto.content).toBe('Called customer');
  });

  it('trims the content before checking its length', async () => {
    const dto = await transformBody({ content: '  padded  ' }, AddActivityDto);

    expect(dto.content).toBe('padded');
  });

  it.each([
    [{ content: '' }],
    [{ content: '   ' }],
    [{ content: 'x'.repeat(2001) }],
    [{ content: 'ok', type: 'FAX' }],
    [{ content: 'ok', extra: true }],
    [{}]
  ])('rejects %p', async (body) => {
    await expect(transformBody(body, AddActivityDto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
