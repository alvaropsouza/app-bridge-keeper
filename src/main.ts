import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  const logger = new Logger('Main');

  app.enableCors({
    origin: String(process.env.CORS_ORIGINS).split(','),
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Bridge Keeper API')
    .setDescription('Authentication Gateway with Stytch')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;

  logger.log(`Docs: http://localhost:${port}/docs`);
  logger.log(`Root: http://localhost:${port}`);

  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
