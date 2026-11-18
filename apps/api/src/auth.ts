import {
  createParamDecorator,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { AppConfig } from './config.js';
import { TOKEN_VERIFIER } from './tokens.js';

export interface AuthUser {
  /** Supabase auth user id (JWT `sub`). */
  sub: string;
  email?: string | undefined;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

/**
 * Verifies Supabase access tokens: signature (project JWKS, or the legacy
 * shared secret), expiry, and audience `authenticated`.
 */
export function supabaseTokenVerifier(config: Pick<AppConfig, 'SUPABASE_URL' | 'SUPABASE_JWT_SECRET'>): TokenVerifier {
  const issuer = config.SUPABASE_URL ? `${config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : undefined;
  const jwks: JWTVerifyGetKey | undefined = issuer
    ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
    : undefined;
  const secret = config.SUPABASE_JWT_SECRET ? new TextEncoder().encode(config.SUPABASE_JWT_SECRET) : undefined;

  return async (token) => {
    const options = { audience: 'authenticated', ...(issuer ? { issuer } : {}) };
    let payload: JWTPayload;
    const alg = peekAlg(token);
    if (alg === 'HS256') {
      if (!secret) throw new UnauthorizedException('Unsupported token');
      ({ payload } = await jwtVerify(token, secret, { ...options, algorithms: ['HS256'] }));
    } else {
      if (!jwks) throw new UnauthorizedException('Unsupported token');
      ({ payload } = await jwtVerify(token, jwks, { ...options, algorithms: ['ES256', 'RS256'] }));
    }
    if (typeof payload.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.sub)) {
      throw new UnauthorizedException('Token has no user');
    }
    return { sub: payload.sub, email: typeof payload['email'] === 'string' ? payload['email'] : undefined };
  };
}

function peekAlg(token: string): string | undefined {
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8')) as { alg?: unknown };
    return typeof header.alg === 'string' ? header.alg : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly verify: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const match = /^Bearer (.+)$/.exec(req.headers['authorization'] ?? '');
    if (!match) throw new UnauthorizedException('Sign in required');
    try {
      req.user = await this.verify(match[1]!);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired sign-in');
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
