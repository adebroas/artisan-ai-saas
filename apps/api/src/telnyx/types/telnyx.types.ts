export interface TelnyxCallPayload {
  data: {
    event_type: string;
    payload: {
      call_control_id: string;
      call_leg_id: string;
      from: string;
      to: string;
      state: string;
    };
  };
}

export interface RealtimeSession {
  callControlId: string;
  sessionId: string;
  openAiWs: import('ws').WebSocket;
  streamId?: string;
}