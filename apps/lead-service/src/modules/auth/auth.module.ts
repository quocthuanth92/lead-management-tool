import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresRaw = configService.get<string>('JWT_EXPIRES_IN', '3600');
        const expiresIn = Number(expiresRaw);
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: { expiresIn: Number.isFinite(expiresIn) ? expiresIn : 3600 }
        };
      }
    })
  ],
  exports: [JwtModule]
})
export class AuthModule {}
