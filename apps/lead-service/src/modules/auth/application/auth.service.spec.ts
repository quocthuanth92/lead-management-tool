import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { UserRepositoryPort } from '../../users/domain/ports/user-repository.port';

describe('AuthService', () => {
  const user = {
    id: '0123456789abcdef01234567',
    email: 'sales@example.com',
    passwordHash: 'stored-hash',
    fullName: 'Sales User',
    role: 'SALESPERSON' as const,
    isActive: true
  };
  let users: jest.Mocked<UserRepositoryPort>;
  let passwords: jest.Mocked<PasswordHasherPort>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let service: AuthService;

  beforeEach(() => {
    users = { findByEmail: jest.fn().mockResolvedValue(user), findById: jest.fn() };
    passwords = { hash: jest.fn(), verify: jest.fn().mockResolvedValue(true) };
    jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    service = new AuthService(users, passwords, jwt as unknown as JwtService);
  });

  it('returns a signed token and public user fields for valid credentials', async () => {
    await expect(service.login({ email: user.email, password: 'correct' })).resolves.toEqual({
      accessToken: 'token',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user.id, role: user.role });
  });

  it('uses the same unauthorized response for unknown users and wrong passwords', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    const unknown = service.login({ email: 'missing@example.com', password: 'wrong' });
    const wrong = service.login({ email: user.email, password: 'wrong' });
    passwords.verify.mockResolvedValue(false);

    await expect(unknown).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(wrong).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwords.verify).toHaveBeenCalledWith('wrong', expect.stringMatching(/^scrypt\$/));
  });

  it('rejects inactive users', async () => {
    users.findByEmail.mockResolvedValue({ ...user, isActive: false });
    await expect(service.login({ email: user.email, password: 'correct' })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });
});
