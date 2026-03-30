import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BusinessRulesService } from './business-rules.service';
import { UpsertBusinessRulesDto } from './dto/upsert-business-rules.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Business Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses/:businessId/rules')
export class BusinessRulesController {
  constructor(private readonly businessRulesService: BusinessRulesService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Règles métier d\'une entreprise' })
  findByBusiness(@Param('businessId') businessId: string) {
    return this.businessRulesService.findByBusiness(businessId);
  }

  @Put()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Créer ou mettre à jour les règles métier' })
  upsert(
    @Param('businessId') businessId: string,
    @Body() dto: UpsertBusinessRulesDto,
  ) {
    return this.businessRulesService.upsert(businessId, dto);
  }
}