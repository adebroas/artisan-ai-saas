import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { FilterAppointmentsDto } from './dto/filter-appointments.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Param('businessId') businessId: string, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(businessId, dto);
  }

  @Get()
  findAll(@Param('businessId') businessId: string, @Query() filters: FilterAppointmentsDto) {
    return this.appointmentsService.findAll(businessId, filters);
  }

  @Get('upcoming')
  upcoming(@Param('businessId') businessId: string) {
    return this.appointmentsService.getUpcoming(businessId);
  }

  @Get(':id')
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.appointmentsService.findOne(businessId, id);
  }

  @Put(':id')
  update(@Param('businessId') businessId: string, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(businessId, id, dto);
  }

  @Delete(':id')
  remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.appointmentsService.remove(businessId, id);
  }
}