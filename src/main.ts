import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { utilities, WinstonModule } from 'nest-winston';
import { nip19 } from 'nostr-tools';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

async function bootstrap() {
  const logRetentionDays = process.env.LOG_RETENTION_DAYS || '30d';
  const logDirectory = process.env.LOG_DIRECTORY || 'logs';

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        // file on daily rotation (error only)
        new winston.transports.DailyRotateFile({
          // %DATE will be replaced by the current date
          filename: `${logDirectory}/%DATE%-error.log`,
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
          maxFiles: logRetentionDays,
        }),
        // same for all levels
        new winston.transports.DailyRotateFile({
          filename: `${logDirectory}/%DATE%.log`,
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.errors({ stack: true }),
            utilities.format.nestLike('NostrBot', { colors: false }),
          ),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false,
          maxFiles: logRetentionDays,
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

  const port = process.env.PORT || 3000;
  const npub = nip19.npubEncode(process.env.NOSTR_BOT_PUBLIC_KEY!);

  const serverSettings = `
### Server settings ###
    Starting on port ${port}
    Nostr public key: ${process.env.NOSTR_BOT_PUBLIC_KEY}
    Link to Nostr public key: https://njump.me/${npub}
    Debug mode: ${process.env.IS_DEBUG_MODE === 'true'}
    domain for NIP-05 verification: ${process.env.NIP05_VERIFICATION_DOMAIN_URL}
    email for NIP-05 verification: ${process.env.NIP05_VERIFICATION_DOMAIN_EMAIL}
    Cache TTL (minutes): ${process.env.CACHE_TTL_MINUTES}
    Reconnection delay (seconds): ${process.env.RECONNECTION_DELAY_SECONDS}
    Log retention days: ${logRetentionDays}
    Log directory: ${logDirectory}
#########`;
  logger.log(serverSettings);

  await app.listen(port);
}

void bootstrap();
