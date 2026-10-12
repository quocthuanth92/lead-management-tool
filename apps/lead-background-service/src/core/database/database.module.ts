import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LeadWriter,
  MongoLeadWriterStore,
  PersistenceModels,
  registerModels
} from '@lead/persistence';
import mongoose, { type Connection } from 'mongoose';

export const MONGO_CONNECTION = Symbol('MONGO_CONNECTION');
export const PERSISTENCE_MODELS = Symbol('PERSISTENCE_MODELS');
export const LEAD_WRITER = Symbol('LEAD_WRITER');

@Module({
  providers: [
    {
      provide: MONGO_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Promise<Connection> =>
        mongoose.createConnection(config.getOrThrow<string>('MONGODB_URI')).asPromise()
    },
    {
      provide: PERSISTENCE_MODELS,
      inject: [MONGO_CONNECTION],
      useFactory: (connection: Connection): PersistenceModels => registerModels(connection)
    },
    {
      provide: LEAD_WRITER,
      inject: [PERSISTENCE_MODELS],
      useFactory: (models: PersistenceModels): LeadWriter =>
        new LeadWriter(new MongoLeadWriterStore(models))
    }
  ],
  exports: [MONGO_CONNECTION, PERSISTENCE_MODELS, LEAD_WRITER]
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(MONGO_CONNECTION) private readonly connection: Connection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close();
  }
}
