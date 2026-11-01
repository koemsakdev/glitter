import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LiveChangeInterceptor } from './live-change';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

/**
 * Global so any service can inject RealtimeService and publish change events
 * without importing this module everywhere.
 */
@Global()
@Module({
  controllers: [RealtimeController],
  providers: [
    RealtimeService,
    RealtimeGateway,
    { provide: APP_INTERCEPTOR, useClass: LiveChangeInterceptor },
  ],
  exports: [RealtimeService],
})
export class RealtimeModule {}
