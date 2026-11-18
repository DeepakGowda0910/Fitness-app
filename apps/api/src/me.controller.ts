import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { users, withUser } from '@fitness/db';
import { eq } from 'drizzle-orm';
import { AuthGuard, CurrentUser, type AuthUser } from './auth.js';
import type { Database } from './database.js';
import { upsertMeRequestSchema } from './schemas.js';
import { DB } from './tokens.js';
import { parseBody } from './validation.js';

/** The signed-in user's account row. Every query runs under row-level security. */
@Controller('v1/me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async get(@CurrentUser() user: AuthUser) {
    const row = await withUser(this.db, user.sub, (tx) =>
      tx.select().from(users).where(eq(users.authProviderId, user.sub)).then((r) => r[0]),
    );
    if (!row) throw new NotFoundException('No account yet. Call PUT /v1/me to create it.');
    return toView(row);
  }

  /** Creates the account on first sign-in, or updates its settings. */
  @Put()
  async upsert(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const settings = parseBody(upsertMeRequestSchema, body ?? {});
    if (!user.email) throw new BadRequestException('Your sign-in has no email address.');
    const row = await withUser(this.db, user.sub, (tx) =>
      tx
        .insert(users)
        .values({ authProviderId: user.sub, email: user.email!, ...settings })
        .onConflictDoUpdate({ target: users.authProviderId, set: { ...settings, updatedAt: new Date() } })
        .returning()
        .then((r) => r[0]!),
    );
    return toView(row);
  }
}

function toView(row: typeof users.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    locale: row.locale,
    units: row.units,
    timezone: row.timezone,
    createdAt: row.createdAt,
  };
}
