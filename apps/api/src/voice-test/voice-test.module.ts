// apps/api/src/voice-test/voice-test.module.ts

import { Module } from '@nestjs/common';
import { VoiceTestGateway } from './voice-test.gateway';
import { VoiceTestService } from './voice-test.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VoiceTestGateway, VoiceTestService],
})
export class VoiceTestModule {}