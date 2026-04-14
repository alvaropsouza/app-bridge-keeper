import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {});
	const logger = new Logger('Main');
	const port = process.env.PORT || 3000;

	app.use(helmet());
	app.use(cookieParser());

	const corsOrigins = process.env.CORS_ORIGINS
		? process.env.CORS_ORIGINS.split(',')
				.map((o) => o.trim())
				.filter(Boolean)
		: ['http://localhost:3001'];

	app.enableCors({
		origin: corsOrigins,
		credentials: true,
	});

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	if (process.env.NODE_ENV !== 'production') {
		const config = new DocumentBuilder()
			.setTitle('Bridge Keeper API')
			.setDescription('Authentication Gateway with Supabase')
			.setVersion('1.0')
			.addBearerAuth()
			.build();
		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('docs', app, document);
		logger.log(`Docs: http://localhost:${port}/docs`);
	}

	logger.log(`Root: http://localhost:${port}`);

	await app.listen(port);

	logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
