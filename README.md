<p align="center">
  <a href="https://status.d420.de/" target="blank"><img src="https://i.postimg.cc/hjYrLrzT/output-onlinepngtools.png" 
  width="200"
  alt="Nest Logo" /></a>
</p>

## Nostr Twitter & Reddit Link Replacer Replybot

This bot scans Nostr for posts containing x.com/twitter.com and reddit.com links and automatically replies with privacy-respecting alternative front-end mirrors.

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

## Project setup

[Nest](https://github.com/nestjs/nest) framework TypeScript bot.

```bash
$ npm install
```

Run `npm run keygen` to generate a public/private key pair - AKA your Nostr account.

Put those in your `.env` file

```txt

# Not used yet
DATABASE_URL="file:./dev.db"

NOSTR_BOT_PRIVATE_KEY="<HEX PRIVATE KEY HERE>"
NOSTR_BOT_PUBLIC_KEY="<HEX PUBLIC KEY HERE>"

AUTH_APP_TOKEN="APP TOKEN TO PROTECT YOUR ENDPOINTS FROM ABUSE"

# Debug mode prints replies to log instead of publishing to Nostr
IS_DEBUG_MODE=true

# Optional for NIP05 verification
NIP05_VERIFICATION_DOMAIN_URL="https://synk.moe/.well-known/nostr.json"
NIP05_VERIFICATION_DOMAIN_EMAIL="bot@synk.moe"

# Nostr note cache cleanup cycle in minutes
CACHE_TTL_MINUTES=30

# Nostr relay reconnection delay settings
RECONNECTION_DELAY_SECONDS=60

# Comma-separated list of Nostr relays to connect to
NOSTR_RELAYS="wss://relay.damus.io,wss://nostr.mom,wss://relay.nostr.band"

# Server port
PORT=3000

# Log file retention settings
LOG_RETENTION_DAYS="30d"
LOG_DIRECTORY="logs"


```

Run `npm start` to start the bot

## Example Bot Reply

When the bot detects Twitter/X or Reddit links in a Nostr post, it replies with a formatted message containing alternative front-end links:

```
Nitter Mirror link(s)

🔗 XCancel:
https://xcancel.com/user/status/123456789

🔗 Poast:
https://nitter.poast.org/user/status/123456789

🔗 Nitter:
https://nitter.net/user/status/123456789

Reddit alternative link(s)

🔗 troddit:
https://www.troddit.com/r/example/comments/abc123

🔗 redlib.privacyredirect (FIN):
https://redlib.privacyredirect.com/r/example/comments/abc123

🔗 redlib.catsarch (US):
https://redlib.catsarch.com/r/example/comments/abc123
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

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

This Nostr bot is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
