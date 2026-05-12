// apps/api/src/voice-test/voice-test.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UrgencyLevel } from '@prisma/client';

export interface CollectedCallData {
  callerFirstName?: string;
  callerLastName?: string;
  callerAddress?: string;
  problemDescription?: string;
  urgencyLevel?: 'none' | 'low' | 'medium' | 'high';
  desiredSlot?: string; // ISO string ou texte libre
}

@Injectable()
export class VoiceTestService {
  private readonly logger = new Logger(VoiceTestService.name);

  // businessId fixe pour la démo
  private readonly DEMO_BUSINESS_ID = 'biz-demo-001';

  constructor(private readonly prisma: PrismaService) {}

  // ─── Créer une CallSession au début de chaque appel ───────────────────────

 async createCallSession(): Promise<string | null> {
  try {
    const session = await this.prisma.callSession.create({
      data: {
        businessId: this.DEMO_BUSINESS_ID,
        callerNumber: 'voice-test',
        status: 'in_progress',
      },
    });
    this.logger.log(`CallSession créée : ${session.id}`);
    return session.id;
  } catch (err: unknown) {
    this.logger.warn(`Impossible de créer la CallSession (businessId inexistant ?) : ${String(err)}`);
    return null;
  }
}
  // ─── Clore la CallSession à la fin ───────────────────────────────────────

  async closeCallSession(callSessionId: string): Promise<void> {
    try {
      await this.prisma.callSession.update({
        where: { id: callSessionId },
        data: {
          status: 'completed',
          endedAt: new Date(),
        },
      });
      this.logger.log(`CallSession clôturée : ${callSessionId}`);
    } catch (err: unknown) {
      this.logger.warn(`Impossible de clôturer la session ${callSessionId} : ${String(err)}`);
    }
  }

  // ─── Sauvegarder les données collectées par Lisa ──────────────────────────

  async saveCollectedData(
    callSessionId: string,
    data: CollectedCallData,
  ): Promise<void> {
    try {
      // Mapper urgencyLevel string → enum Prisma
      const urgencyMap: Record<string, UrgencyLevel> = {
        none: 'none',
        low: 'low',
        medium: 'medium',
        high: 'high',
      };
      const urgency: UrgencyLevel = urgencyMap[data.urgencyLevel ?? 'none'] ?? 'none';

      // Upsert CallExtractedData
      await this.prisma.callExtractedData.upsert({
        where: { callSessionId },
        create: {
          callSessionId,
          callerFirstName: data.callerFirstName,
          callerLastName: data.callerLastName,
          callerAddress: data.callerAddress,
          problemDescription: data.problemDescription,
          urgencyLevel: urgency,
          desiredSlot: data.desiredSlot ? this.parseSlot(data.desiredSlot) : undefined,
        },
        update: {
          callerFirstName: data.callerFirstName,
          callerLastName: data.callerLastName,
          callerAddress: data.callerAddress,
          problemDescription: data.problemDescription,
          urgencyLevel: urgency,
          desiredSlot: data.desiredSlot ? this.parseSlot(data.desiredSlot) : undefined,
        },
      });

      // Mettre à jour urgencyLevel sur la CallSession aussi
      await this.prisma.callSession.update({
        where: { id: callSessionId },
        data: { urgencyLevel: urgency },
      });

      this.logger.log(`Données sauvegardées pour session ${callSessionId} : ${JSON.stringify(data)}`);
    } catch (err: unknown) {
      this.logger.error(`Erreur sauvegarde données pour ${callSessionId} : ${String(err)}`);
    }
  }

  // ─── Parser un créneau texte en Date ──────────────────────────────────────
  // Lisa dira "demain matin" ou "jeudi 14h" — on fait du best-effort

  private parseSlot(slot: string): Date | undefined {
    try {
      const d = new Date(slot);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // pas une date ISO
    }
    // Si c'est du texte libre ("demain matin"), on ne peut pas parser → on ignore
    return undefined;
  }
}