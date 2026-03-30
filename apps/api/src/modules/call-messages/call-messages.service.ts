import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCallMessageDto } from './dto/create-call-message.dto';

@Injectable()
export class CallMessagesService {
  constructor(private prisma: PrismaService) {}

  async findByCall(callSessionId: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    return this.prisma.callMessage.findMany({
      where: { callSessionId },
      orderBy: { offsetMs: 'asc' },
    });
  }

  async create(callSessionId: string, dto: CreateCallMessageDto) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    return this.prisma.callMessage.create({
      data: { callSessionId, ...dto },
    });
  }

  async createMany(callSessionId: string, messages: CreateCallMessageDto[]) {
    const call = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
    });
    if (!call) throw new NotFoundException('Appel introuvable');

    return this.prisma.callMessage.createMany({
      data: messages.map((m) => ({ callSessionId, ...m })),
    });
  }
}