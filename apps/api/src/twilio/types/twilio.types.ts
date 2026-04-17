export interface TwilioVoiceWebhookPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ApiVersion: string;
}

export interface TwilioStreamStartPayload {
  event: 'start';
  sequenceNumber: string;
  start: {
    streamSid: string;
    callSid: string;
    accountSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  streamSid: string;
}

export interface TwilioStreamMediaPayload {
  event: 'media';
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
  streamSid: string;
}

export interface TwilioStreamStopPayload {
  event: 'stop';
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
  streamSid: string;
}

export type TwilioStreamPayload =
  | TwilioStreamStartPayload
  | TwilioStreamMediaPayload
  | TwilioStreamStopPayload;

export interface RealtimeSession {
  callSid: string;
  streamSid: string;
  sessionId: string;
  openAiWs: import('ws').WebSocket;
}