import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @Query() filters: { page?: string; limit?: string; entity?: string; userId?: string },
  ) {
    return this.auditLogsService.findAll(businessId, filters);
  }
}