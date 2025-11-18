<p align="center">
  <a href="https://status.d420.de/" target="blank"><img src="https://i.postimg.cc/hjYrLrzT/output-onlinepngtools.png" 
  width="200"
  alt="Nest Logo" /></a>
</p>

## Nostr X/Twitter Link Replacer Replybot

This bot scans Nostr for posts containing x.com/twitter.com links and automatically replies with privacy-respecting Nitter mirrors.

## Why?

- Twitter/X embeds trackers, cookies, and surveillance bloat
- Nitter is a lightweight, open-source alternative that strips out junk
- Avoid feeding Elon’s engagement machine while still sharing/viewing it's content


## Project setup

[Nest](https://github.com/nestjs/nest) framework TypeScript bot.

```bash
$ npm install
```

Run `npm run keygen` to generate a public/private key pair - AKA your Nostr account.

Put those in your `.env` file

```txt
NOSTR_BOT_PRIVATE_KEY="<HEX PRIVATE KEY HERE>"
NOSTR_BOT_PUBLIC_KEY="<HEX PUBLIC KEY HERE>"

AUTH_APP_TOKEN="APP TOKEN TO PROTECT YOUR ENDPOINTS FROM ABUSE"

# Debug mode prints replies to log instead of publishing to Nostr
IS_DEBUG_MODE=true

# Optional for NIP05 verification
NIP05_VERIFICATION_DOMAIN_URL="https://synk.moe/.well-known/nostr.json"
NIP05_VERIFICATION_DOMAIN_EMAIL="bot@synk.moe"
```

Run  `npm start` to start the bot

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
