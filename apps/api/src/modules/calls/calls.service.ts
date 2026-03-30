import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { CallFiltersDto } from './dto/call-filters.dto';
import { getPaginationParams, paginate } from '../../common/types/pagination.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: CallFiltersDto) {
    const page = parseInt(filters.page ?? '1', 10);
    const limit = parseInt(filters.limit ?? '20', 10);
    const { take, skip } = getPaginationParams(page, limit);

    const where: Prisma.CallSessionWhereInput = {};

    if (filters.businessId) where.businessId = filters.businessId;
    if (filters.status) where.status = filters.status;
    if (filters.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;
    if (filters.outcome) where.outcome = filters.outcome;
    if (filters.callerNumber) {
      where.callerNumber = {
        contains: filters.callerNumber,
        mode: 'insensitive',
      };
    }
    if (filters.dateFrom || filters.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) where.startedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startedAt.lte = new Date(filters.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.callSession.findMany({
        where,
        take,
        skip,
        orderBy: { startedAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, trade: true } },
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          summary: { select: { shortSummary: true, outcome: true, tags: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.callSession.count({ where }),
    ]);

    return paginate(data, total, page, take);
  }

  async findOne(id: string) {
    const call = await this.prisma.callSession.findUnique({
      where: { id },
      include: {
        business: true,
        customer: true,
        messages: { orderBy: { offsetMs: 'asc' } },
        extractedData: true,
        summary: true,
        appointments: true,
      },
    });

    if (!call) throw new NotFoundException('Appel introuvable');
    return call;
  }

  async create(dto: CreateCallDto) {
    const business = await this.prisma.business.findUnique({
      where: { id: dto.businessId },
    });
    if (!business) throw new NotFoundException('Entreprise introuvable');

    return this.prisma.callSession.create({
      data: dto,
      include: {
        business: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCallDto) {
    await this.findOne(id);
    return this.prisma.callSession.update({
      where: { id },
      data: dto,
    });
  }

  async getRecentCalls(businessId?: string, limit = 10) {
    const where: Prisma.CallSessionWhereInput = businessId
      ? { businessId }
      : {};

    return this.prisma.callSession.findMany({
      where,
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        summary: { select: { shortSummary: true, outcome: true } },
      },
    });
  }
}