import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { getPaginationParams, paginate } from '../../common/types/pagination.types';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const { take, skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { siret: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          phoneNumbers: true,
          _count: {
            select: { calls: true, customers: true, appointments: true },
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    return paginate(data, total, page, take);
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        phoneNumbers: true,
        businessRules: true,
        integrations: true,
        _count: {
          select: { calls: true, customers: true, appointments: true },
        },
      },
    });

    if (!business) throw new NotFoundException('Entreprise introuvable');
    return business;
  }

  async create(dto: CreateBusinessDto) {
    if (dto.siret) {
      const existing = await this.prisma.business.findUnique({
        where: { siret: dto.siret },
      });
      if (existing) {
        throw new ConflictException('Une entreprise avec ce SIRET existe déjà');
      }
    }

    return this.prisma.business.create({
      data: dto,
      include: { phoneNumbers: true },
    });
  }

  async update(id: string, dto: UpdateBusinessDto) {
    await this.findOne(id);
    return this.prisma.business.update({
      where: { id },
      data: dto,
      include: { phoneNumbers: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.business.delete({ where: { id } });
    return { message: 'Entreprise supprimée' };
  }

  async getStats(id: string) {
    await this.findOne(id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCalls, todayCalls, totalCustomers, upcomingAppointments] =
      await Promise.all([
        this.prisma.callSession.count({ where: { businessId: id } }),
        this.prisma.callSession.count({
          where: { businessId: id, startedAt: { gte: today } },
        }),
        this.prisma.customer.count({ where: { businessId: id } }),
        this.prisma.appointment.count({
          where: {
            businessId: id,
            startAt: { gte: new Date() },
            status: { in: ['pending', 'confirmed'] },
          },
        }),
      ]);

    return { totalCalls, todayCalls, totalCustomers, upcomingAppointments };
  }
}