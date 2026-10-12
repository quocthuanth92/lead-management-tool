import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module';
import { AuthService } from './application/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PASSWORD_HASHER_PORT } from './domain/ports/password-hasher.port';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher';
import { AuthController } from './interface/http/auth.controller';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rawExpiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');
        const match = /^(\d+)(s|m|h|d)?$/.exec(rawExpiresIn);
        const amount = Number(match?.[1] ?? 3600);
        const multiplier =
          match?.[2] === 'd' ? 86_400 : match?.[2] === 'h' ? 3_600 : match?.[2] === 'm' ? 60 : 1;
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: { expiresIn: amount * multiplier }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    ScryptPasswordHasher,
    { provide: PASSWORD_HASHER_PORT, useExisting: ScryptPasswordHasher }
  ],
  exports: [JwtModule, AuthService, PASSWORD_HASHER_PORT, JwtAuthGuard]
})
export class AuthModule {}
