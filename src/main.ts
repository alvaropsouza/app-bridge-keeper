import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  let allowedOrigins: string[] = [];
  if (process.env.CORS_ORIGINS) {
    allowedOrigins = process.env.CORS_ORIGINS.split(',');
  } else if (process.env.NODE_ENV === 'production') {
    allowedOrigins = [];
  } else {
    allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  }

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Bridge Keeper API')
    .setDescription('Authentication Gateway with Stytch')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API Documentation available at: http://localhost:${port}/docs`);
}

bootstrap();
