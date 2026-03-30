import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentsDto } from './dto/filter-appointments.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        businessId,
        title: dto.title,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        customerId: dto.customerId,
        callSessionId: dto.callSessionId,
        description: dto.description,
        notes: dto.notes,
        status: dto.status ?? AppointmentStatus.pending,
        source: dto.source ?? 'ai_agent',
      },
      include: { customer: true, callSession: true },
    });
  }

  async findAll(businessId: string, filters: FilterAppointmentsDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.from || filters.to) {
      where.startAt = {};
      if (filters.from) where.startAt.gte = new Date(filters.from);
      if (filters.to) where.startAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          customer: true,
          callSession: { select: { id: true, status: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(businessId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, businessId },
      include: { customer: true, callSession: true },
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    return appt;
  }

  async update(businessId: string, id: string, dto: UpdateAppointmentDto) {
    await this.findOne(businessId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        title: dto.title,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        customerId: dto.customerId,
        callSessionId: dto.callSessionId,
        description: dto.description,
        notes: dto.notes,
        status: dto.status,
        source: dto.source,
      },
      include: { customer: true },
    });
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.appointment.delete({ where: { id } });
    return { message: 'Appointment deleted' };
  }

  async getUpcoming(businessId: string, days = 7) {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);

    return this.prisma.appointment.findMany({
      where: {
        businessId,
        startAt: { gte: from, lte: to },
        status: { not: AppointmentStatus.cancelled },
      },
      orderBy: { startAt: 'asc' },
      include: { customer: true },
    });
  }
}