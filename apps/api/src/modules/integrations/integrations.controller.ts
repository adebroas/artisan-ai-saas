import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { UpsertIntegrationDto } from './dto/upsert-integration.dto';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  findAll(@Param('businessId') businessId: string) {
    return this.integrationsService.findAll(businessId);
  }

  @Get(':id')
  findOne(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.integrationsService.findOne(businessId, id);
  }

  @Post()
  upsert(@Param('businessId') businessId: string, @Body() dto: UpsertIntegrationDto) {
    return this.integrationsService.upsert(businessId, dto);
  }

  @Put(':id/toggle')
  toggle(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.integrationsService.toggleStatus(businessId, id);
  }

  @Delete(':id')
  remove(@Param('businessId') businessId: string, @Param('id') id: string) {
    return this.integrationsService.remove(businessId, id);
  }
}