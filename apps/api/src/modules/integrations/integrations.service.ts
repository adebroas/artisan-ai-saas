import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';
import { IntegrationStatus, Prisma } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    return this.prisma.integration.findMany({ where: { businessId } });
  }

  async findOne(businessId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, businessId },
    });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  async upsert(businessId: string, dto: UpsertIntegrationDto) {
    const existing = await this.prisma.integration.findFirst({
      where: { businessId, type: dto.type },
    });

    const data = {
      businessId,
      type: dto.type,
      status: dto.status ?? IntegrationStatus.inactive,
      label: dto.label,
      config: (dto.config ?? {}) as Prisma.InputJsonValue,
    };

    if (existing) {
      return this.prisma.integration.update({ where: { id: existing.id }, data });
    }
    return this.prisma.integration.create({ data });
  }

  async toggleStatus(businessId: string, id: string) {
    const integration = await this.findOne(businessId, id);
    const newStatus = integration.status === IntegrationStatus.active
      ? IntegrationStatus.inactive
      : IntegrationStatus.active;
    return this.prisma.integration.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.integration.delete({ where: { id } });
    return { message: 'Integration removed' };
  }
}