import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginRequest, LoginResponse } from '@lead/shared-contracts';

import { PASSWORD_HASHER_PORT, PasswordHasherPort } from '../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort
} from '../../users/domain/ports/user-repository.port';

const DUMMY_PASSWORD_HASH = `scrypt$${'00'.repeat(16)}$${'00'.repeat(64)}`;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort,
    private readonly jwtService: JwtService
  ) {}

  async login(request: LoginRequest): Promise<LoginResponse> {
    const user = await this.users.findByEmail(request.email);
    const validPassword = await this.passwordHasher.verify(
      request.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH
    );
    if (!user || !user.isActive || !validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    };
  }
}
