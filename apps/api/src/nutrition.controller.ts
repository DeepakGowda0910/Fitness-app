import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { assessCheckin, computeTargets, targetsInputSchema } from '@fitness/calc-engine';
import { generateWeekPlan, PlanError } from '@fitness/meal-planner';
import { AuthGuard } from './auth.js';
import { checkinAssessRequestSchema, mealPlanRequestSchema } from './schemas.js';
import { parseBody } from './validation.js';

/**
 * Stateless calculations: nothing is stored. Every number comes from the
 * deterministic engine; these endpoints only validate and pass through.
 * Signed-in users only, so the API is not an open calculator.
 */
@Controller('v1')
@UseGuards(AuthGuard)
export class NutritionController {
  @Post('targets/preview')
  @HttpCode(200)
  previewTargets(@Body() body: unknown) {
    return computeTargets(parseBody(targetsInputSchema, body));
  }

  @Post('meal-plans/preview')
  @HttpCode(200)
  previewMealPlan(@Body() body: unknown) {
    const request = parseBody(mealPlanRequestSchema, body);
    try {
      return generateWeekPlan(request);
    } catch (err) {
      if (err instanceof PlanError) throw new BadRequestException({ message: err.message, code: err.code });
      throw err;
    }
  }

  @Post('checkins/assess')
  @HttpCode(200)
  assessCheckin(@Body() body: unknown) {
    return assessCheckin(parseBody(checkinAssessRequestSchema, body));
  }
}
