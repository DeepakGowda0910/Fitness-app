import { Module, type DynamicModule } from '@nestjs/common';
import { AuthGuard, type TokenVerifier } from './auth.js';
import type { Database } from './database.js';
import { HealthController } from './health.controller.js';
import { MeController } from './me.controller.js';
import { NutritionController } from './nutrition.controller.js';
import { DB, TOKEN_VERIFIER } from './tokens.js';

@Module({})
export class AppModule {
  static register(deps: { db: Database; verifyToken: TokenVerifier }): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, MeController, NutritionController],
      providers: [
        { provide: DB, useValue: deps.db },
        { provide: TOKEN_VERIFIER, useValue: deps.verifyToken },
        AuthGuard,
      ],
    };
  }
}
