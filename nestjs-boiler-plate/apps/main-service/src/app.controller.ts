import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards/opa.guard';

@Controller()
@Public()
export class AppController {
    @Get()
    getHello(): string {
        return 'Welcome to API Service! /health is working.';
    }
}
