import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FilterCustomersDto } from './dto/filter-customers.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@Param('businessId') businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto);
  }

  @Get()
  findAll(@Param('businessId') businessId: string, @Query() filters: FilterCustomersDto) {
    return this.customersService.findAll(businessId, filters);
  }

  @Get(':id')
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }

  @Put(':id')
  update(@Param('businessId') businessId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.customersService.remove(businessId, id);
  }
}