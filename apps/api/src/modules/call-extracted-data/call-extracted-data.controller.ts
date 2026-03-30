import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CallExtractedDataService } from './call-extracted-data.service';
import { UpsertExtractedDataDto } from './dto/upsert-extracted-data.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Call Extracted Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calls/:callId/extracted-data')
export class CallExtractedDataController {
  constructor(
    private readonly callExtractedDataService: CallExtractedDataService,
  ) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Données extraites d\'un appel' })
  findByCall(@Param('callId') callId: string) {
    return this.callExtractedDataService.findByCall(callId);
  }

  @Put()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Créer ou mettre à jour les données extraites' })
  upsert(
    @Param('callId') callId: string,
    @Body() dto: UpsertExtractedDataDto,
  ) {
    return this.callExtractedDataService.upsert(callId, dto);
  }
}