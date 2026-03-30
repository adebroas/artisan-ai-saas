import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessTrade } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Plomberie Dupont' })
  @IsString()
  name: string;

  @ApiProperty({ enum: BusinessTrade })
  @IsEnum(BusinessTrade)
  trade: BusinessTrade;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  siret?: string;

  @ApiPropertyOptional({ example: 'contact@plomberie-dupont.fr' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+33600000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '12 rue de la Paix' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '75001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Europe/Paris' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'fr' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: '75, 92, 93' })
  @IsOptional()
  @IsString()
  interventionZone?: string;

  @ApiPropertyOptional({ example: 'Bonjour, vous êtes bien chez Plomberie Dupont.' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;
}