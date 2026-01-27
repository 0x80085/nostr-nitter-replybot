import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { NostrInteractorService } from './nostr/services/nostr-interactor/nostr-interactor.service';
import { catchError, map, of, toArray } from 'rxjs';
import {
  ApiOperation,
  ApiBody,
  ApiProperty,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AppTokenGuard } from './auth/guards/app-token.guard';
import { StatsService } from './stats/stats.service';

class PostMessageDto {
  @ApiProperty({
    description: 'The message to post to Nostr',
    example: 'Hello from my Nostr bot!',
    required: true,
  })
  message: string;
}
class UpdateNIP05Dto {
  @ApiProperty({
    description: 'The name to display on the Nostr profile',
    example: 'Alice',
    required: true,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'The bio/about section of the Nostr profile',
    example: 'Bitcoin enthusiast and developer',
    required: false,
    maxLength: 500,
  })
  about: string;

  @ApiProperty({
    description: 'URL of the profile image',
    example: 'https://example.com/profile.jpg',
    required: false,
    format: 'url',
  })
  profileImageUrl: string;

  // @ApiProperty({
  //   description: 'NIP-05 identifier (usually email-like format)',
  //   example: 'alice@example.com',
  //   required: false,
  //   pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  // })
  // nip05?: string;

  // @ApiProperty({
  //   description: 'Lightning address for payments',
  //   example: 'alice@getalby.com',
  //   required: false,
  //   pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  // })
  // lud16?: string;
}

@ApiTags('Nostr')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly nostrService: NostrInteractorService,
    private readonly statsService: StatsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('relays')
  @ApiOperation({
    summary: 'Get Nostr relays status',
    description: 'Get Nostr relays status',
  })
  @UseGuards(AppTokenGuard)
  @ApiBearerAuth('app-token')
  getRelays() {
    return this.nostrService.getRelaysStatusAsJson();
  }

  @Post('post')
  @ApiOperation({
    summary: 'Post a message to Nostr',
    description: 'Publishes a signed message to the Nostr network',
  })
  @ApiBody({
    type: PostMessageDto,
    description: 'The message content to publish',
  })
  @UseGuards(AppTokenGuard)
  @ApiBearerAuth('app-token')
  postMessage(@Body() body: { message: string }) {
    return this.nostrService.post(body.message).pipe(
      toArray(),
      map((pk) => {
        console.log('####');
        console.log(pk);

        const res = pk.map((p) => ({
          from: p.from,
          ok: p.ok,
          msg: p.message,
        }));

        return res;
      }),
      catchError((e) => {
        console.log(e);
        return of(HttpStatus.INTERNAL_SERVER_ERROR);
      }),
    );
  }

  @Post('verify-NIP-05')
  @ApiOperation({
    summary: 'Verify NIP-05',
    description:
      'Publishes a NIP-05 message to the Nostr network (https://github.com/nostr-protocol/nips/blob/master/05.md)',
  })
  @UseGuards(AppTokenGuard)
  @ApiBearerAuth('app-token')
  postNIP05(@Body() { name, about, profileImageUrl }: UpdateNIP05Dto) {
    return this.nostrService.verifyNIP05(name, about, profileImageUrl).pipe(
      toArray(),
      map((pk) => {
        console.log('####');
        console.log(pk);

        const res = pk.map((p) => ({
          from: p.from,
          ok: p.ok,
          msg: p.message,
        }));

        return res;
      }),
      catchError((e) => {
        console.log(e);
        return of(HttpStatus.INTERNAL_SERVER_ERROR);
      }),
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get statistics dashboard',
    description: 'Returns the HTML statistics dashboard page',
  })
  getStats() {
    return this.statsService.generateStatsHTML();
  }
}
