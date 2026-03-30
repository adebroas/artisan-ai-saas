import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UrgencyLevel } from '@prisma/client';

export class UpsertExtractedDataDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  callerFirstName?: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  callerLastName?: string;

  @ApiPropertyOptional({ example: '+33600000000' })
  @IsOptional()
  @IsString()
  callerPhone?: string;

  @ApiPropertyOptional({ example: '12 rue de la Paix, Paris' })
  @IsOptional()
  @IsString()
  callerAddress?: string;

  @ApiPropertyOptional({ example: 'Fuite d\'eau sous l\'évier' })
  @IsOptional()
  @IsString()
  problemDescription?: string;

  @ApiPropertyOptional({ enum: UrgencyLevel })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgencyLevel?: UrgencyLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  desiredSlot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  confirmedSlot?: string;

  @ApiPropertyOptional({ example: 'repair' })
  @IsOptional()
  @IsString()
  detectedIntent?: string;

  @ApiPropertyOptional({ example: 'new' })
  @IsOptional()
  @IsString()
  customerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}