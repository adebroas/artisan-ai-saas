-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'operator', 'viewer');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('initiated', 'in_progress', 'completed', 'failed', 'abandoned', 'transferred');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('none', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('message_taken', 'appointment_created', 'transferred', 'callback_requested', 'spam', 'no_outcome', 'out_of_scope');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('ai_agent', 'manual', 'calendar_sync');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('google_calendar', 'outlook_calendar', 'email_smtp', 'webhook_crm', 'twilio', 'telnyx', 'deepgram', 'elevenlabs');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('active', 'inactive', 'error', 'pending_auth');

-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('assistant', 'caller');

-- CreateEnum
CREATE TYPE "BusinessTrade" AS ENUM ('plumber', 'heating_engineer', 'electrician', 'locksmith', 'roofer', 'painter', 'carpenter', 'tiler', 'mason', 'general');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'config_change');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" "BusinessTrade" NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "interventionZone" TEXT,
    "welcomeMessage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_phone_numbers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "openingHours" JSONB NOT NULL DEFAULT '{}',
    "supportedRequestTypes" JSONB NOT NULL DEFAULT '[]',
    "urgencyRules" JSONB NOT NULL DEFAULT '[]',
    "requiredFields" JSONB NOT NULL DEFAULT '[]',
    "transferRules" JSONB NOT NULL DEFAULT '{}',
    "appointmentRules" JSONB NOT NULL DEFAULT '{}',
    "callFilterRules" JSONB NOT NULL DEFAULT '{}',
    "closingMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "callerNumber" TEXT NOT NULL,
    "calledNumber" TEXT,
    "externalCallId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "status" "CallStatus" NOT NULL DEFAULT 'initiated',
    "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'none',
    "outcome" "CallOutcome",
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_messages" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "speaker" "Speaker" NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "offsetMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_extracted_data" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "callerFirstName" TEXT,
    "callerLastName" TEXT,
    "callerPhone" TEXT,
    "callerAddress" TEXT,
    "problemDescription" TEXT,
    "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'none',
    "desiredSlot" TIMESTAMP(3),
    "confirmedSlot" TIMESTAMP(3),
    "detectedIntent" TEXT,
    "customerType" TEXT,
    "additionalData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_summaries" (
    "id" TEXT NOT NULL,
    "callSessionId" TEXT NOT NULL,
    "shortSummary" TEXT NOT NULL,
    "structuredSummary" JSONB NOT NULL DEFAULT '{}',
    "recommendedAction" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outcome" "CallOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,
    "lastContactAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "callSessionId" TEXT,
    "customerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "source" "AppointmentSource" NOT NULL DEFAULT 'ai_agent',
    "externalEventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'inactive',
    "label" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_siret_key" ON "businesses"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "business_rules_businessId_key" ON "business_rules"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_externalCallId_key" ON "call_sessions"("externalCallId");

-- CreateIndex
CREATE INDEX "call_sessions_businessId_idx" ON "call_sessions"("businessId");

-- CreateIndex
CREATE INDEX "call_sessions_callerNumber_idx" ON "call_sessions"("callerNumber");

-- CreateIndex
CREATE INDEX "call_sessions_status_idx" ON "call_sessions"("status");

-- CreateIndex
CREATE INDEX "call_sessions_urgencyLevel_idx" ON "call_sessions"("urgencyLevel");

-- CreateIndex
CREATE INDEX "call_sessions_startedAt_idx" ON "call_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "call_messages_callSessionId_idx" ON "call_messages"("callSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "call_extracted_data_callSessionId_key" ON "call_extracted_data"("callSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "call_summaries_callSessionId_key" ON "call_summaries"("callSessionId");

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_businessId_phone_key" ON "customers"("businessId", "phone");

-- CreateIndex
CREATE INDEX "appointments_businessId_idx" ON "appointments"("businessId");

-- CreateIndex
CREATE INDEX "appointments_startAt_idx" ON "appointments"("startAt");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_businessId_type_key" ON "integrations"("businessId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_idx" ON "audit_logs"("businessId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "business_phone_numbers" ADD CONSTRAINT "business_phone_numbers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_rules" ADD CONSTRAINT "business_rules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_messages" ADD CONSTRAINT "call_messages_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_extracted_data" ADD CONSTRAINT "call_extracted_data_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_summaries" ADD CONSTRAINT "call_summaries_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "call_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
