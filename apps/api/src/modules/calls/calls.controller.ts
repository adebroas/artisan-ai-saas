import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import { CallFiltersDto } from './dto/call-filters.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Liste des appels avec filtres' })
  findAll(@Query() filters: CallFiltersDto) {
    return this.callsService.findAll(filters);
  }

  @Get('recent')
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Derniers appels' })
  getRecent(
    @Query('businessId') businessId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.callsService.getRecentCalls(businessId, limit);
  }

  @Get(':id')
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Détail complet d\'un appel' })
  findOne(@Param('id') id: string) {
    return this.callsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Créer un appel (utilisé par l\'agent IA)' })
  create(@Body() dto: CreateCallDto) {
    return this.callsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Mettre à jour un appel' })
  update(@Param('id') id: string, @Body() dto: UpdateCallDto) {
    return this.callsService.update(id, dto);
  }
}