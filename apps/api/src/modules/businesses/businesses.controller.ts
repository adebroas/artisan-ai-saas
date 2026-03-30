import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Liste des entreprises' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.businessesService.findAll(page, limit, search);
  }

  @Get(':id')
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Détail entreprise' })
  findOne(@Param('id') id: string) {
    return this.businessesService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Statistiques entreprise' })
  getStats(@Param('id') id: string) {
    return this.businessesService.getStats(id);
  }

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Créer une entreprise' })
  create(@Body() dto: CreateBusinessDto) {
    return this.businessesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Modifier une entreprise' })
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Supprimer une entreprise' })
  remove(@Param('id') id: string) {
    return this.businessesService.remove(id);
  }
}