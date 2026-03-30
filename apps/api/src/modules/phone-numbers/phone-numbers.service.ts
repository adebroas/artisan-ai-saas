import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';

@Injectable()
export class PhoneNumbersService {
  constructor(private prisma: PrismaService) {}

  async findByBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Entreprise introuvable');

    return this.prisma.businessPhoneNumber.findMany({
      where: { businessId },
      orderBy: { isPrimary: 'desc' },
    });
  }

  async create(businessId: string, dto: CreatePhoneNumberDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Entreprise introuvable');

    if (dto.isPrimary) {
      await this.prisma.businessPhoneNumber.updateMany({
        where: { businessId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.businessPhoneNumber.create({
      data: { businessId, ...dto },
    });
  }

  async remove(id: string) {
    const phone = await this.prisma.businessPhoneNumber.findUnique({
      where: { id },
    });
    if (!phone) throw new NotFoundException('Numéro introuvable');

    await this.prisma.businessPhoneNumber.delete({ where: { id } });
    return { message: 'Numéro supprimé' };
  }

  async toggleActive(id: string) {
    const phone = await this.prisma.businessPhoneNumber.findUnique({
      where: { id },
    });
    if (!phone) throw new NotFoundException('Numéro introuvable');

    return this.prisma.businessPhoneNumber.update({
      where: { id },
      data: { isActive: !phone.isActive },
    });
  }
}