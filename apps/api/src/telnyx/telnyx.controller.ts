import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TelnyxRealtimeService } from './telnyx-realtime.service';

@ApiTags('telnyx')
@Controller('telnyx')
export class TelnyxController {
  private readonly logger = new Logger(TelnyxController.name);
  private readonly businessId: string;

  constructor(
    private readonly realtimeService: TelnyxRealtimeService,
    private readonly config: ConfigService,
  ) {
    this.businessId = this.config.get<string>('DEMO_BUSINESS_ID', 'biz-demo-001');
  }

  @Post('voice')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Telnyx voice webhook' })
@ApiBody({ schema: { type: 'object' } })
async handleVoiceWebhook(@Body() body: any): Promise<{ received: boolean }> {
  const eventType = body?.data?.event_type;
  const payload = body?.data?.payload;

  this.logger.log(`Telnyx event: ${eventType}`);

  if (!eventType || !payload) return { received: true };

  switch (eventType) {
    case 'call.initiated':
      // Répond immédiatement à l'appel
      await this.realtimeService.answerCall(
        payload.call_control_id,
        payload.from,
        this.businessId,
      );
      break;

    case 'call.answered':
      // Lance la session OpenAI en arrière-plan après que l'appel est décroché
      this.realtimeService.startRealtimeSession(
        payload.call_control_id,
        payload.from,
        this.businessId,
      ).catch(err => this.logger.error(`Failed to start realtime session: ${err}`));
      break;

    case 'call.hangup':
      await this.realtimeService.endSession(payload.call_control_id);
      break;

    default:
      this.logger.debug(`Unhandled event: ${eventType}`);
  }

  return { received: true };
}

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telnyx audio stream' })
  @ApiBody({ schema: { type: 'object' } })
  async handleAudioStream(@Body() body: any): Promise<void> {
    const callControlId = body?.call_control_id;
    const audioPayload = body?.payload;
    if (callControlId && audioPayload) {
      await this.realtimeService.handleTelnyxAudio(callControlId, audioPayload);
    }
  }
}