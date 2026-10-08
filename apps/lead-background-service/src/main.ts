import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const brokers = configService.getOrThrow<string>('KAFKA_BROKERS').split(',');
  const clientId = configService.getOrThrow<string>('KAFKA_CLIENT_ID');
  const groupId = configService.getOrThrow<string>('KAFKA_GROUP_ID');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId,
        brokers
      },
      consumer: {
        groupId
      }
    }
  });

  await app.startAllMicroservices();
  const port = Number(configService.get<number>('PORT', 3002));
  await app.listen(port);
}

void bootstrap();
