import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { TwilioRealtimeService } from './twilio-realtime.service';
import { TwilioVoiceWebhookPayload } from './types/twilio.types';

@ApiTags('twilio')
@Controller('twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);
  private readonly businessId: string;

  constructor(
    private readonly realtimeService: TwilioRealtimeService,
    private readonly config: ConfigService,
  ) {
    this.businessId = this.config.get<string>('DEMO_BUSINESS_ID', 'biz-demo-001');
  }

  @Post('voice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Twilio voice webhook — retourne TwiML' })
  async handleVoiceWebhook(
    @Body() body: TwilioVoiceWebhookPayload,
    @Res() res: Response,
  ): Promise<void> {
    const callSid = body?.CallSid;
    const callerNumber = body?.From;

    this.logger.log(`Incoming call: ${callSid} from ${callerNumber}`);

    this.realtimeService.registerPendingCall(callSid, callerNumber, this.businessId);

    const ngrokUrl = this.config.get<string>('NGROK_URL', '');
    const wsUrl = ngrokUrl
      ? `wss://${ngrokUrl.replace(/^https?:\/\//, '')}/twilio/stream`
      : `wss://YOUR_NGROK_URL/twilio/stream`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="callerNumber" value="${callerNumber}" />
    </Stream>
  </Connect>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    res.send(twiml);
  }
}