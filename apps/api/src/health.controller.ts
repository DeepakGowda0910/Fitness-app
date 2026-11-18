import { Controller, Get } from '@nestjs/common';
import { ENGINE_VERSION } from '@fitness/calc-engine';
import { PLANNER_VERSION } from '@fitness/meal-planner';

@Controller('v1/health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', engineVersion: ENGINE_VERSION, plannerVersion: PLANNER_VERSION };
  }
}
