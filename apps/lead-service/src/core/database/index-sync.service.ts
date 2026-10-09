import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { syncAllIndexes } from '@lead/persistence';
import { Connection } from 'mongoose';

@Injectable()
export class IndexSyncService implements OnModuleInit {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get<boolean>('MONGODB_SYNC_INDEXES')) {
      await syncAllIndexes(this.connection);
    }
  }
}
