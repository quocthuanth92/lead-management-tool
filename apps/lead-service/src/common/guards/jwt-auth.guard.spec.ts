import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const request = (authorization?: string) => ({ headers: { authorization } });
  const context = (req: ReturnType<typeof request>) =>
    ({
      switchToHttp: () => ({ getRequest: () => req })
    }) as ExecutionContext;

  it('rejects missing and malformed bearer tokens', async () => {
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn() } as unknown as JwtService);
    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    await expect(guard.canActivate(context(request('Basic token')))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('attaches a verified identity to the request', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: '0123456789abcdef01234567',
        role: 'SALESPERSON'
      })
    };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService);
    const req = request('Bearer valid-token') as ReturnType<typeof request> & {
      user?: { userId: string; role: string };
    };
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect(req.user).toEqual({ userId: '0123456789abcdef01234567', role: 'SALESPERSON' });
  });
});
