import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwilioController } from './twilio.controller';
import { TwilioRealtimeService } from './twilio-realtime.service';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';

@Module({
  imports: [ConfigModule, OrchestratorModule],
  controllers: [TwilioController],
  providers: [TwilioRealtimeService],
  exports: [TwilioRealtimeService],
})
export class TwilioModule {}