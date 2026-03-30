import { Module } from '@nestjs/common';
import { CallSummariesController } from './call-summaries.controller';
import { CallSummariesService } from './call-summaries.service';

@Module({
  controllers: [CallSummariesController],
  providers: [CallSummariesService],
  exports: [CallSummariesService],
})
export class CallSummariesModule {}