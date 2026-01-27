import { Logger } from '@nestjs/common';
import { ConnectionStatePacket } from 'rx-nostr';
import { tap } from 'rxjs';

/**
 * RxJS operator that logs connection state changes with appropriate log levels
 * @param logger - NestJS Logger instance to use for logging
 * @returns tap operator that logs connection state changes
 */
export const logConnectionState = (logger: Logger) => {
  return tap<ConnectionStatePacket>(({ from, state }) => {
    const timestamp = new Date().toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeLabel = `${timestamp} (${timezone})`;
    const relayName = from || 'unknown';

    logger.debug(
      'Relay connection state changed:',
      `Relay: ${relayName}`,
      `from: ${from} `,
      `>> to ${state}`,
    );

    switch (state) {
      case 'error': {
        logger.error(
          `[CONNECTION ERROR] ${timeLabel} - Relay "${relayName}" encountered an error and connection failed`,
        );
        break;
      }
      case 'rejected': {
        logger.error(
          `[CONNECTION REJECTED] ${timeLabel} - Relay "${relayName}" rejected the connection attempt`,
        );
        break;
      }
      case 'terminated': {
        logger.error(
          `[CONNECTION TERMINATED] ${timeLabel} - Connection to relay "${relayName}" was terminated (possible network loss)`,
        );
        break;
      }
      case 'waiting-for-retrying': {
        logger.warn(
          `[WAITING TO RETRY] ${timeLabel} - Relay "${relayName}" connection lost, waiting before retry attempt`,
        );
        break;
      }
      case 'retrying': {
        logger.warn(
          `[RETRYING CONNECTION] ${timeLabel} - Attempting to reconnect to relay "${relayName}"`,
        );
        break;
      }
      case 'dormant': {
        logger.warn(
          `[CONNECTION DORMANT] ${timeLabel} - Relay "${relayName}" connection is inactive/sleeping (possible network issue)`,
        );
        break;
      }
      case 'initialized': {
        logger.log(
          `[CONNECTION INITIALIZED] ${timeLabel} - Relay "${relayName}" connection has been initialized`,
        );
        break;
      }
      case 'connecting': {
        logger.log(
          `[CONNECTING] ${timeLabel} - Attempting to connect to relay "${relayName}"`,
        );
        break;
      }
      case 'connected': {
        logger.log(
          `[CONNECTION ESTABLISHED] ${timeLabel} - Successfully connected to relay "${relayName}"`,
        );
        break;
      }
      default: {
        logger.warn(
          `[UNKNOWN STATE] ${timeLabel} - Relay "${relayName}" entered unhandled state: "${state as string}"`,
        );
        break;
      }
    }
  });
};
