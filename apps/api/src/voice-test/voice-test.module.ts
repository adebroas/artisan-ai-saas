
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceTestGateway } from './voice-test.gateway';

@Module({
  imports: [ConfigModule],
  providers: [VoiceTestGateway],
})
export class VoiceTestModule {}
