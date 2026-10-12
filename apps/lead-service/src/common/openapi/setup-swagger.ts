import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX } from '@lead/shared-contracts';

import { OPENAPI_MODELS } from './openapi.models';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Lead Service API')
    .setDescription('REST API for lead management.')
    .setVersion('1.0.0')
    .addServer(`/${API_PREFIX}`)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearerAuth')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'apiKeyAuth')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
    extraModels: OPENAPI_MODELS
  });

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json'
  });
}
