import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelnyxController } from './telnyx.controller';
import { TelnyxService } from './telnyx.service';
import { TelnyxRealtimeService } from './telnyx-realtime.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [ConfigModule, OrchestratorModule],
  controllers: [TelnyxController],
  providers: [TelnyxService, TelnyxRealtimeService],
  exports: [TelnyxService, TelnyxRealtimeService],
})
export class TelnyxModule {}