import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const expected = 'a-long-api-key';
  const makeContext = (value?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ header: () => value })
      })
    }) as ExecutionContext;

  it('accepts the configured key and rejects missing or incorrect keys', () => {
    const guard = new ApiKeyGuard({
      getOrThrow: () => expected
    } as unknown as ConfigService);
    expect(guard.canActivate(makeContext(expected))).toBe(true);
    expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(makeContext('wrong'))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(makeContext(`${expected}different-length`))).toThrow(
      UnauthorizedException
    );
  });
});
