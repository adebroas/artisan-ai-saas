import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallStatus, AppointmentStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(businessId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCalls,
      callsThisMonth,
      callsLastMonth,
      abandonedCalls,
      totalCustomers,
      newCustomersThisMonth,
      upcomingAppointments,
      appointmentsThisMonth,
      avgCallDuration,
      callsByStatus,
      callsLast7Days,
    ] = await Promise.all([
      this.prisma.callSession.count({ where: { businessId } }),
      this.prisma.callSession.count({ where: { businessId, startedAt: { gte: startOfMonth } } }),
      this.prisma.callSession.count({ where: { businessId, startedAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
      this.prisma.callSession.count({ where: { businessId, status: CallStatus.abandoned } }),
      this.prisma.customer.count({ where: { businessId } }),
      this.prisma.customer.count({ where: { businessId, createdAt: { gte: startOfMonth } } }),
      this.prisma.appointment.count({
        where: {
          businessId,
          startAt: { gte: now },
          status: { not: AppointmentStatus.cancelled },
        },
      }),
      this.prisma.appointment.count({ where: { businessId, startAt: { gte: startOfMonth } } }),
      this.prisma.callSession.aggregate({
        where: { businessId, durationSeconds: { not: null } },
        _avg: { durationSeconds: true },
      }),
      this.prisma.callSession.groupBy({
        by: ['status'],
        where: { businessId },
        _count: true,
      }),
      this.prisma.callSession.findMany({
        where: { businessId, startedAt: { gte: last7days } },
        select: { startedAt: true, status: true },
        orderBy: { startedAt: 'asc' },
      }),
    ]);

    const dailyCalls = this.buildDailyChart(callsLast7Days);
    const callGrowth = callsLastMonth > 0
      ? Math.round(((callsThisMonth - callsLastMonth) / callsLastMonth) * 100)
      : 0;

    return {
      calls: {
        total: totalCalls,
        thisMonth: callsThisMonth,
        lastMonth: callsLastMonth,
        growth: callGrowth,
        abandoned: abandonedCalls,
        avgDuration: Math.round(avgCallDuration._avg.durationSeconds || 0),
        byStatus: callsByStatus.map(s => ({ status: s.status, count: s._count })),
        daily: dailyCalls,
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
      },
      appointments: {
        upcoming: upcomingAppointments,
        thisMonth: appointmentsThisMonth,
      },
    };
  }

  async getRecentActivity(businessId: string, limit = 10) {
    const [recentCalls, recentAppointments] = await Promise.all([
      this.prisma.callSession.findMany({
        where: { businessId },
        orderBy: { startedAt: 'desc' },
        take: limit,
        include: {
          customer: true,
          summary: { select: { shortSummary: true } },
        },
      }),
      this.prisma.appointment.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true },
      }),
    ]);

    return { recentCalls, recentAppointments };
  }

  private buildDailyChart(calls: { startedAt: Date; status: string }[]) {
    const days: Record<string, { date: string; total: number; abandoned: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: key, total: 0, abandoned: 0 };
    }
    for (const call of calls) {
      const key = call.startedAt.toISOString().split('T')[0];
      if (days[key]) {
        days[key].total++;
        if (call.status === 'abandoned') days[key].abandoned++;
      }
    }
    return Object.values(days);
  }
}