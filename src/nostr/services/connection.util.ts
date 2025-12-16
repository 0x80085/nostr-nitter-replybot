import { Logger } from '@nestjs/common';
import { tap } from 'rxjs';

export interface ConnectionState {
  from: string;
  state: string;
}

/**
 * RxJS operator that logs connection state changes with appropriate log levels
 * @param logger - NestJS Logger instance to use for logging
 * @returns tap operator that logs connection state changes
 */
export const logConnectionState = (logger: Logger) => {
  return tap<ConnectionState>(({ from, state }) => {
    const timestamp = new Date().toISOString();
    const relayName = from || 'unknown';

    logger.debug(
      'Relay connection state changed:',
      `from: ${from} `,
      `>> to ${state}`,
    );

    switch (state) {
      case 'error': {
        logger.error(
          `🔥 [CONNECTION ERROR] ${timestamp} - Relay "${relayName}" encountered an error and connection failed`,
        );
        break;
      }
      case 'rejected': {
        logger.error(
          `🚫 [CONNECTION REJECTED] ${timestamp} - Relay "${relayName}" rejected the connection attempt`,
        );
        break;
      }
      case 'terminated': {
        logger.error(
          `💀 [CONNECTION TERMINATED] ${timestamp} - Connection to relay "${relayName}" was terminated (possible network loss)`,
        );
        break;
      }
      case 'waiting-for-retrying': {
        logger.warn(
          `⏳ [WAITING TO RETRY] ${timestamp} - Relay "${relayName}" connection lost, waiting before retry attempt`,
        );
        break;
      }
      case 'retrying': {
        logger.warn(
          `🔄 [RETRYING CONNECTION] ${timestamp} - Attempting to reconnect to relay "${relayName}"`,
        );
        break;
      }
      case 'dormant': {
        logger.warn(
          `😴 [CONNECTION DORMANT] ${timestamp} - Relay "${relayName}" connection is inactive/sleeping (possible network issue)`,
        );
        break;
      }
      case 'initialized': {
        logger.log(
          `🚀 [CONNECTION INITIALIZED] ${timestamp} - Relay "${relayName}" connection has been initialized`,
        );
        break;
      }
      case 'connecting': {
        logger.log(
          `🔌 [CONNECTING] ${timestamp} - Attempting to connect to relay "${relayName}"`,
        );
        break;
      }
      case 'connected': {
        logger.log(
          `✅ [CONNECTION ESTABLISHED] ${timestamp} - Successfully connected to relay "${relayName}"`,
        );
        break;
      }
      case 'reconnecting': {
        logger.warn(
          `🔄 [RECONNECTING] ${timestamp} - Relay "${relayName}" is reconnecting after connection loss`,
        );
        break;
      }
      case 'closed': {
        logger.warn(
          `🔒 [CONNECTION CLOSED] ${timestamp} - Connection to relay "${relayName}" was closed`,
        );
        break;
      }
      case 'timeout': {
        logger.error(
          `⏰ [CONNECTION TIMEOUT] ${timestamp} - Connection to relay "${relayName}" timed out`,
        );
        break;
      }
      case 'not-started': {
        logger.debug(
          `⚪ [NOT STARTED] ${timestamp} - Relay "${relayName}" connection not yet started`,
        );
        break;
      }
      default: {
        logger.warn(
          `❓ [UNKNOWN STATE] ${timestamp} - Relay "${relayName}" entered unhandled state: "${state}"`,
        );
        break;
      }
    }

    // Additional logging for connection loss detection
    const connectionLossStates = [
      'terminated',
      'dormant',
      'error',
      'timeout',
      'closed',
    ];
    if (connectionLossStates.includes(state)) {
      logger.error(
        `🌐 [NETWORK ISSUE DETECTED] Connection to relay "${relayName}" appears to be lost (state: ${state})`,
      );
    }
  });
};
