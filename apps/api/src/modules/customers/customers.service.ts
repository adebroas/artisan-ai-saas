import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomersDto } from './dto/filter-customers.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        businessId,
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        notes: dto.notes,
      },
    });
  }

  async findAll(businessId: string, filters: FilterCustomersDto) {
    const page = parseInt(filters.page || '1');
    const limit = parseInt(filters.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { calls: true, appointments: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        calls: { orderBy: { startedAt: 'desc' }, take: 10 },
        appointments: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(businessId, id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        phone: dto.phone,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        notes: dto.notes,
      },
    });
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { message: 'Customer deleted' };
  }
}