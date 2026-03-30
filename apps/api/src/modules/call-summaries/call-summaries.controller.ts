import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CallSummariesService } from './call-summaries.service';
import { UpsertSummaryDto } from './dto/upsert-summary.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Call Summaries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calls/:callId/summary')
export class CallSummariesController {
  constructor(private readonly callSummariesService: CallSummariesService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Résumé d\'un appel' })
  findByCall(@Param('callId') callId: string) {
    return this.callSummariesService.findByCall(callId);
  }

  @Put()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Créer ou mettre à jour le résumé' })
  upsert(@Param('callId') callId: string, @Body() dto: UpsertSummaryDto) {
    return this.callSummariesService.upsert(callId, dto);
  }
}