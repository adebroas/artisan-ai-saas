import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PhoneNumbersService } from './phone-numbers.service';
import { CreatePhoneNumberDto } from './dto/create-phone-number.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Phone Numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('businesses/:businessId/phone-numbers')
export class PhoneNumbersController {
  constructor(private readonly phoneNumbersService: PhoneNumbersService) {}

  @Get()
  @Roles(UserRole.operator)
  @ApiOperation({ summary: 'Numéros de téléphone d\'une entreprise' })
  findByBusiness(@Param('businessId') businessId: string) {
    return this.phoneNumbersService.findByBusiness(businessId);
  }

  @Post()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Ajouter un numéro de téléphone' })
  create(
    @Param('businessId') businessId: string,
    @Body() dto: CreatePhoneNumberDto,
  ) {
    return this.phoneNumbersService.create(businessId, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Activer / désactiver un numéro' })
  toggleActive(@Param('id') id: string) {
    return this.phoneNumbersService.toggleActive(id);
  }

  @Delete(':id')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Supprimer un numéro' })
  remove(@Param('id') id: string) {
    return this.phoneNumbersService.remove(id);
  }
}