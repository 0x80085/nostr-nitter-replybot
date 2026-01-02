<p align="center">
  <a href="https://status.d420.de/" target="blank"><img src="https://i.postimg.cc/hjYrLrzT/output-onlinepngtools.png" 
  width="200"
  alt="Logo" /></a>
</p>

## Nostr Social Media Link Replacer Bot

This NestJS-powered bot scans Nostr for posts containing x.com/twitter.com and reddit.com links and automatically replies with privacy-respecting alternative front-end mirrors.

## Why?

- Twitter/X and Reddit embed trackers, cookies, and surveillance bloat
- Alternative front-ends like Nitter and Redlib are lightweight, open-source alternatives that strip out tracking
- Browse social media content without feeding engagement algorithms or compromising your privacy
- Supports multiple mirror instances for better reliability and availability

## Features

### Supported Platforms

**Twitter/X Alternative Front-ends:**

- XCancel (https://xcancel.com)
- Poast Nitter (https://nitter.poast.org)
- Nitter.net (https://nitter.net)

**Reddit Alternative Front-ends:**

- Troddit (https://www.troddit.com)
- Redlib PrivacyRedirect (Finland) (https://redlib.privacyredirect.com)
- Redlib CatsArch (US) (https://redlib.catsarch.com)

### How it Works

1. **Real-time Monitoring**: Listens to Nostr network for new text notes (kind 1 events)
2. **Link Detection**: Scans posts for Twitter/X and Reddit URLs using regex patterns
3. **URL Cleaning**: Strips tracking parameters and query strings from detected URLs
4. **Alternative Generation**: Creates corresponding URLs for multiple alternative front-ends
5. **Smart Replies**: Posts formatted replies with all available alternative links
6. **Cache Management**: Prevents duplicate replies using time-based caching
7. **Debug Mode**: Optional logging-only mode for testing without publishing

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

## Project Setup

This is a [NestJS](https://github.com/nestjs/nest) framework TypeScript bot.

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/0x80085/nostr-nitter-replybot.git
cd nostr-nitter-replybot
npm install
```

### 2. Generate Nostr Keys

Generate a public/private key pair for your Nostr bot account:

```bash
npm run keygen
```

**⚠️ Security Note**: The generated keys will be used in the local `.env` file. Keep your private key secure and never commit it to version control.

### 3. Environment Configuration

Create a `.env` file in the root directory with the following configuration:

```txt
# Environment (use 'production' when deployed to a live server)
NODE_ENV=development

# Database configuration (for future use with Prisma)
DATABASE_URL="file:./dev.db"

# Nostr Bot Keys (Generated from step 2)
NOSTR_BOT_PRIVATE_KEY="<HEX PRIVATE KEY HERE>"
NOSTR_BOT_PUBLIC_KEY="<HEX PUBLIC KEY HERE>"

# API Security (Generate a random string to protect your endpoints)
AUTH_APP_TOKEN="<GENERATE_RANDOM_TOKEN>"

# Debug mode - set to false in production
IS_DEBUG_MODE=true

# Optional NIP05 verification settings
NIP05_VERIFICATION_DOMAIN_URL="https://example.com/.well-known/nostr.json"
NIP05_VERIFICATION_DOMAIN_EMAIL="bot@example.com"

# Cache and connection settings
CACHE_TTL_MINUTES=30
RECONNECTION_DELAY_SECONDS=60

# Nostr relay configuration
NOSTR_RELAYS="wss://relay.damus.io,wss://nostr.mom,wss://relay.nostr.band"

# Bot behavior settings
IGNORED_AUTHORS="npub1c4vv0nrfh0dchujhs2mndw4u5653k393v20x4kme2txev9hhz0qw4cqk7"

# Server configuration
PORT=3000

# Logging settings
LOG_RETENTION_DAYS="30d"
LOG_DIRECTORY="logs"
```

**🔐 Security Important**:

- Never commit your `.env` file to version control
- Use a strong, random `AUTH_APP_TOKEN`
- Keep your private key confidential

### 4. Start the Bot

```bash
# Development mode with auto-reload
npm run start:dev

# Production mode
npm run start:prod

# Basic start
npm start
```

## Example Bot Reply

When the bot detects Twitter/X or Reddit links in a Nostr post, it replies with a formatted message containing alternative front-end links:

```
🔗 Twitter/X Alternative Links:

XCancel: https://xcancel.com/user/status/123456789
Poast Nitter: https://nitter.poast.org/user/status/123456789
Nitter: https://nitter.net/user/status/123456789

🔗 Reddit Alternative Links:

Troddit: https://www.troddit.com/r/example/comments/abc123
Redlib (Finland): https://redlib.privacyredirect.com/r/example/comments/abc123
Redlib (US): https://redlib.catsarch.com/r/example/comments/abc123
```

## Additional Utilities

The project includes additional utility scripts:

```bash
# Transform existing keys between formats
npm run transform
```

## Development Commands

```bash
# Development with auto-reload
npm run start:dev

# Debug mode with inspector
npm run start:debug

# Build for production
npm run build

# Production mode
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint
```

## Testing

The project includes comprehensive testing capabilities:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Debug tests
npm run test:debug
```

Coverage reports are generated in the `coverage/` directory.

## API Documentation

The bot exposes a REST API on port 3000 (configurable via `PORT` environment variable):

- **GET /**: Health check endpoint
- **Swagger Documentation**: Available at `http://localhost:3000/api` when running

The API is protected by the `AUTH_APP_TOKEN` for security.

## Monitoring and Logs

- **Log Files**: Stored in the `logs/` directory
- **Log Rotation**: Configured for daily rotation with retention period set by `LOG_RETENTION_DAYS`
- **Debug Mode**: When `IS_DEBUG_MODE=true`, replies are logged instead of posted to Nostr

## Verification

To verify your bot is working correctly:

1. **Check Logs**: Monitor the log files for connection status and activity
2. **Test Mode**: Run with `IS_DEBUG_MODE=true` to see what replies would be generated
3. **Health Check**: Visit `http://localhost:3000` for a basic health check
4. **Network Status**: Check relay connections in the logs

## Troubleshooting

### Common Issues

**Bot not connecting to relays:**

- Check your internet connection
- Verify relay URLs in `NOSTR_RELAYS` are correct and responsive
- Check firewall settings for WebSocket connections

**No replies being generated:**

- Ensure `IS_DEBUG_MODE` is set to `false` for live posting
- Verify your user's public key is not in the `IGNORED_AUTHORS` list
- Check that your private key is valid

### Debug Mode Testing

To test the bot without posting to Nostr:

1. Set `IS_DEBUG_MODE=true` in your `.env` file
2. Start the bot with `npm run start:dev`
3. Monitor logs to see detected links and generated replies
4. When ready for live operation, set `IS_DEBUG_MODE=false` and NODE_ENV to `production`

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

## Resources

Check out a few resources that may come in handy when working with this project:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- rx-nostr which powers this project. [View on Github](https://github.com/penpenpng/rx-nostr)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)

## License

This Nostr bot is [MIT licensed](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.
