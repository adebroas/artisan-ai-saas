import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertBusinessRulesDto } from './dto/upsert-business-rules.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BusinessRulesService {
  constructor(private prisma: PrismaService) {}

  async findByBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Entreprise introuvable');

    const rules = await this.prisma.businessRule.findUnique({
      where: { businessId },
    });

    return rules ?? { businessId, message: 'Aucune règle configurée' };
  }

  async upsert(businessId: string, dto: UpsertBusinessRulesDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Entreprise introuvable');

    const data: Prisma.BusinessRuleUncheckedCreateInput = {
      businessId,
      ...(dto.openingHours && {
        openingHours: dto.openingHours as Prisma.InputJsonValue,
      }),
      ...(dto.supportedRequestTypes && {
        supportedRequestTypes: dto.supportedRequestTypes as Prisma.InputJsonValue,
      }),
      ...(dto.urgencyRules && {
        urgencyRules: dto.urgencyRules as Prisma.InputJsonValue,
      }),
      ...(dto.requiredFields && {
        requiredFields: dto.requiredFields as Prisma.InputJsonValue,
      }),
      ...(dto.transferRules && {
        transferRules: dto.transferRules as Prisma.InputJsonValue,
      }),
      ...(dto.appointmentRules && {
        appointmentRules: dto.appointmentRules as Prisma.InputJsonValue,
      }),
      ...(dto.callFilterRules && {
        callFilterRules: dto.callFilterRules as Prisma.InputJsonValue,
      }),
      ...(dto.closingMessage && { closingMessage: dto.closingMessage }),
    };

    return this.prisma.businessRule.upsert({
      where: { businessId },
      create: data,
      update: data,
    });
  }
}