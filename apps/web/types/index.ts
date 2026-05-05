// ─── Enums ───────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export type CallStatus =
  | 'initiated'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'abandoned'
  | 'transferred';

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type CallOutcome =
  | 'message_taken'
  | 'appointment_created'
  | 'transferred'
  | 'callback_requested'
  | 'spam'
  | 'no_outcome'
  | 'out_of_scope';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type AppointmentSource = 'ai_agent' | 'manual' | 'calendar_sync';

export type IntegrationType =
  | 'google_calendar'
  | 'outlook_calendar'
  | 'email_smtp'
  | 'webhook_crm'
  | 'twilio'
  | 'telnyx'
  | 'deepgram'
  | 'elevenlabs';

export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending_auth';

export type BusinessTrade =
  | 'plumber'
  | 'heating_engineer'
  | 'electrician'
  | 'locksmith'
  | 'roofer'
  | 'painter'
  | 'carpenter'
  | 'tiler'
  | 'mason'
  | 'general';

export type Speaker = 'assistant' | 'caller';

// ─── Models ──────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  trade: BusinessTrade;
  siret: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  locale: string;
  interventionZone: string | null;
  welcomeMessage: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  phoneNumbers?: BusinessPhoneNumber[];
  businessRules?: BusinessRule;
}

export interface BusinessPhoneNumber {
  id: string;
  businessId: string;
  number: string;
  label: string | null;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export interface BusinessRule {
  id: string;
  businessId: string;
  openingHours: Record<string, { open: string; close: string } | null>;
  supportedRequestTypes: string[];
  urgencyRules: { keyword: string; urgency: string }[];
  requiredFields: string[];
  transferRules: Record<string, any>;
  appointmentRules: Record<string, any>;
  callFilterRules: Record<string, any>;
  closingMessage: string | null;
}

export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  _count?: { calls: number; appointments: number };
}

export interface CallSession {
  id: string;
  businessId: string;
  customerId: string | null;
  callerNumber: string;
  calledNumber: string | null;
  externalCallId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: CallStatus;
  urgencyLevel: UrgencyLevel;
  outcome: CallOutcome | null;
  recordingUrl: string | null;
  createdAt: string;
  customer?: Customer | null;
  messages?: CallMessage[];
  extractedData?: CallExtractedData | null;
  summary?: CallSummary | null;
  appointments?: Appointment[];
}

export interface CallMessage {
  id: string;
  callSessionId: string;
  speaker: Speaker;
  text: string;
  confidence: number | null;
  offsetMs: number | null;
  createdAt: string;
}

export interface CallExtractedData {
  id: string;
  callSessionId: string;
  callerFirstName: string | null;
  callerLastName: string | null;
  callerPhone: string | null;
  callerAddress: string | null;
  problemDescription: string | null;
  urgencyLevel: UrgencyLevel;
  desiredSlot: string | null;
  confirmedSlot: string | null;
  detectedIntent: string | null;
  customerType: string | null;
  additionalData: Record<string, any>;
}

export interface CallSummary {
  id: string;
  callSessionId: string;
  shortSummary: string;
  structuredSummary: Record<string, any>;
  recommendedAction: string | null;
  tags: string[];
  outcome: CallOutcome | null;
}

export interface Appointment {
  id: string;
  businessId: string;
  callSessionId: string | null;
  customerId: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  externalEventId: string | null;
  notes: string | null;
  createdAt: string;
  customer?: Customer | null;
  callSession?: CallSession | null;
}

export interface Integration {
  id: string;
  businessId: string;
  type: IntegrationType;
  status: IntegrationStatus;
  label: string | null;
  config: Record<string, any>;
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  businessId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
}

// ─── API responses ────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface DashboardStats {
  calls: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growth: number;
    abandoned: number;
    avgDuration: number;
    byStatus: { status: CallStatus; count: number }[];
    daily: { date: string; total: number; abandoned: number }[];
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
  appointments: {
    upcoming: number;
    thisMonth: number;
  };
}

export interface RecentActivity {
  recentCalls: CallSession[];
  recentAppointments: Appointment[];
}

export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { calls: number; appointments: number };
  calls?: CallSession[];
  appointments?: Appointment[];
}