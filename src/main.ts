import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { utilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        // file on daily rotation (error only)
        new winston.transports.DailyRotateFile({
          // %DATE will be replaced by the current date
          filename: `logs/%DATE%-error.log`,
          level: 'error',
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            utilities.format.nestLike('NostrBot', { colors: false }),
          ),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false, // don't want to zip our logs
          maxFiles: '30d', // will keep log until they are older than 30 days
        }),
        // same for all levels
        new winston.transports.DailyRotateFile({
          filename: `logs/%DATE%.log`,
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            utilities.format.nestLike('NostrBot', { colors: false }),
          ),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false,
          maxFiles: '30d',
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            utilities.format.nestLike('NostrBot'),
          ),
        }),
      ],
    }),
  });

  const logger = new Logger('Main');

  const config = new DocumentBuilder()
    .setTitle('Nostr Replybot Twitter <> Nitter Link Swapper')
    .setDescription(
      'Scans Nostr for posts w Twitter links and posts the Nitter link in replies',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        name: 'Authorization',
        description: 'Enter your app token',
        in: 'header',
      },
      'app-token', // This is the name to refer to this security scheme
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = 3000;

  logger.log(`Starting on port ${port}`);

  await app.listen(port);
}

bootstrap();
