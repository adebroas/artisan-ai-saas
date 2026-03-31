import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { ConversationStateService } from './conversation-state/conversation-state.service';
import { StateStoreService, REDIS_CLIENT } from './conversation-state/state-store.service';
import { StateMachineService } from './state-machine/state-machine.service';
import { LocalParserService } from './local-parser/local-parser.service';
import { LlmExtractorService } from './llm-extractor/llm-extractor.service';
import { DecisionEngineService } from './decision-engine/decision-engine.service';
import { ResponseBuilderService } from './response-builder/response-builder.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [OrchestratorController],
  providers: [
    // Fournit le client Redis directement depuis les variables d'env
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        });
      },
    },
    OrchestratorService,
    ConversationStateService,
    StateStoreService,
    StateMachineService,
    LocalParserService,
    LlmExtractorService,
    DecisionEngineService,
    ResponseBuilderService,
  ],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}