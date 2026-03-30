import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertSummaryDto } from './dto/upsert-summary.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CallSummariesService {
  constructor(private prisma: PrismaService) {}

  async findByCall(callSessionId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    const summary = await this.prisma.callSummary.findUnique({
      where: { callSessionId },
    });

    return summary ?? { callSessionId, message: 'Aucun résumé disponible' };
  }

  async upsert(callSessionId: string, dto: UpsertSummaryDto) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    const data: Prisma.CallSummaryUncheckedCreateInput = {
      callSessionId,
      shortSummary: dto.shortSummary,
      structuredSummary: dto.structuredSummary as
        | Prisma.InputJsonValue
        | undefined,
      recommendedAction: dto.recommendedAction,
      tags: dto.tags ?? [],
      outcome: dto.outcome,
    };

    return this.prisma.callSummary.upsert({
      where: { callSessionId },
      create: data,
      update: data,
    });
  }
}