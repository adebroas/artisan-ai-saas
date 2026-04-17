import * as dotenv from 'dotenv';
dotenv.config();

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

// Configs
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { BusinessRulesModule } from './modules/business-rules/business-rules.module';
import { PhoneNumbersModule } from './modules/phone-numbers/phone-numbers.module';
import { CallsModule } from './modules/calls/calls.module';
import { CallMessagesModule } from './modules/call-messages/call-messages.module';
import { CallExtractedDataModule } from './modules/call-extracted-data/call-extracted-data.module';
import { CallSummariesModule } from './modules/call-summaries/call-summaries.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { TwilioModule } from './twilio/twilio.module';
import { VoiceTestModule } from './voice-test/voice-test.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, redisConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    BusinessRulesModule,
    PhoneNumbersModule,
    CallsModule,
    CallMessagesModule,
    CallExtractedDataModule,
    CallSummariesModule,
    CustomersModule,
    AppointmentsModule,
    IntegrationsModule,
    DashboardModule,
    AuditLogsModule,
    OrchestratorModule,
    TwilioModule,
    VoiceTestModule,
  ],
})
export class AppModule {}