import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

@Injectable()
export class TelnyxService {
  private readonly logger = new Logger(TelnyxService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.getOrThrow<string>('TELNYX_API_KEY');
  }

  private async post(path: string, body: object): Promise<any> {
    const response = await fetch(`${TELNYX_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telnyx API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  async answerCall(callControlId: string): Promise<void> {
    try {
      await this.post(`/calls/${callControlId}/actions/answer`, {});
      this.logger.log(`Call answered: ${callControlId}`);
    } catch (err) {
      this.logger.error(`Failed to answer call: ${err}`);
      throw err;
    }
  }

  async startStream(
    callControlId: string,
    streamUrl: string,
  ): Promise<void> {
    try {
      await this.post(`/calls/${callControlId}/actions/streaming_start`, {
        stream_url: streamUrl,
        stream_track: 'both_tracks',
      });
      this.logger.log(`Stream started for: ${callControlId}`);
    } catch (err) {
      this.logger.error(`Failed to start stream: ${err}`);
      throw err;
    }
  }

  async stopStream(callControlId: string): Promise<void> {
    try {
      await this.post(`/calls/${callControlId}/actions/streaming_stop`, {});
    } catch (err) {
      this.logger.warn(`Failed to stop stream: ${err}`);
    }
  }

  async hangupCall(callControlId: string): Promise<void> {
    try {
      await this.post(`/calls/${callControlId}/actions/hangup`, {});
      this.logger.log(`Call hung up: ${callControlId}`);
    } catch (err) {
      this.logger.warn(`Failed to hangup: ${err}`);
    }
  }

  async sendAudio(
    callControlId: string,
    audioBase64: string,
  ): Promise<void> {
    try {
      await this.post(`/calls/${callControlId}/actions/playback_start`, {
        audio_url: `data:audio/raw;base64,${audioBase64}`,
        encoding: 'PCMU',
        sample_rate: 8000,
      });
    } catch (err) {
      this.logger.warn(`Failed to send audio: ${err}`);
    }
  }
}