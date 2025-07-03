import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
@Injectable()
export class AppTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();

    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const authParts = authHeader.split(' ');

    if (authParts.length !== 2) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const [bearer, token] = authParts as [string, string];

    if (bearer.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const appToken = this.configService.getOrThrow<string>('AUTH_APP_TOKEN');

    if (token !== appToken) {
      throw new UnauthorizedException('Invalid app token');
    }

    return true;
  }
}
