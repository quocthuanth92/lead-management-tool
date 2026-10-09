import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateBackgroundEnv } from './env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (config: Record<string, unknown>) => validateBackgroundEnv(config)
    })
  ]
})
export class ConfigAppModule {}
