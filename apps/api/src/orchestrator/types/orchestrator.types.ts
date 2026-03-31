export type ConversationStep =
  | 'greeting'
  | 'collect_issue'
  | 'collect_name'
  | 'collect_address'
  | 'detect_urgency'
  | 'closing'
  | 'closed';

export type SessionStatus =
  | 'active'
  | 'waiting'
  | 'closed'
  | 'error';

export interface CollectedData {
  issueDescription?: string;
  fullName?: string;
  address?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  urgencyDetected?: boolean;
  callerPhone?: string;
}

export interface ConversationTurn {
  role: 'assistant' | 'caller';
  content: string;
  timestamp: string;
}

export interface CallState {
  sessionId: string;
  businessId: string;
  callId?: string;
  status: SessionStatus;
  currentStep: ConversationStep;
  callerPhone?: string;
  collectedData: CollectedData;
  lastAssistantMessage: string;
  history: ConversationTurn[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface LocalParseResult {
  success: boolean;
  confidence: number;
  value?: string | boolean;
  reason?: string;
}

export interface ExtractionResult {
  issueDescription?: string;
  fullName?: string;
  address?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  urgencyDetected?: boolean;
  unrecognizedIntent?: boolean;
  raw?: string;
}

export interface OrchestratorDecision {
  nextStep: ConversationStep;
  shouldClose: boolean;
  shouldMarkUrgent: boolean;
  shouldAskQuestion: boolean;
  requiresTransfer: boolean;
  extractedData: Partial<CollectedData>;
  confidence: number;
}

export interface OrchestratorResponse {
  sessionId: string;
  assistantMessage: string;
  updatedState: CallState;
  extractedData: Partial<CollectedData>;
  decision: OrchestratorDecision;
}

export interface SessionSummary {
  sessionId: string;
  businessId: string;
  callId?: string;
  collectedData: CollectedData;
  turnCount: number;
  durationSeconds: number;
  urgent: boolean;
  closedAt: string;
  finalState: CallState;
}