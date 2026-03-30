import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertExtractedDataDto } from './dto/upsert-extracted-data.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CallExtractedDataService {
  constructor(private prisma: PrismaService) {}

  async findByCall(callSessionId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    const data = await this.prisma.callExtractedData.findUnique({
      where: { callSessionId },
    });

    return data ?? { callSessionId, message: 'Aucune donnée extraite' };
  }

  async upsert(callSessionId: string, dto: UpsertExtractedDataDto) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    const data: Prisma.CallExtractedDataUncheckedCreateInput = {
      callSessionId,
      ...dto,
      desiredSlot: dto.desiredSlot ? new Date(dto.desiredSlot) : undefined,
      confirmedSlot: dto.confirmedSlot
        ? new Date(dto.confirmedSlot)
        : undefined,
      additionalData: dto.additionalData as Prisma.InputJsonValue | undefined,
    };

    return this.prisma.callExtractedData.upsert({
      where: { callSessionId },
      create: data,
      update: data,
    });
  }
}