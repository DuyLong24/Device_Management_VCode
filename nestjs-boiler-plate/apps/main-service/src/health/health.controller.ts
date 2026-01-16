import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/guards/opa.guard';

@Controller('health')
@Public() // Health endpoints are public
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('ready')
  ready() {
    // Add more complex readiness checks here if needed
    // e.g., database connection, external services
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
