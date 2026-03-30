import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    businessId?: string;
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before as Prisma.InputJsonValue,
        after: params.after as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  }

  async findAll(
    businessId: string,
    filters: { page?: string; limit?: string; entity?: string; userId?: string },
  ) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '50');
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (filters.entity) where.entity = filters.entity;
    if (filters.userId) where.userId = filters.userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}