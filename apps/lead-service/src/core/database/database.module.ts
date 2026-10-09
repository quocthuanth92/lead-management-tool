import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MODEL_DEFINITIONS } from '@lead/persistence';

import { IndexSyncService } from './index-sync.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI')
      })
    }),
    MongooseModule.forFeature([...MODEL_DEFINITIONS])
  ],
  providers: [IndexSyncService],
  exports: [MongooseModule]
})
export class DatabaseModule {}
