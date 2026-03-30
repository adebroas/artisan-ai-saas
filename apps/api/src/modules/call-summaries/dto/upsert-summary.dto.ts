import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallOutcome } from '@prisma/client';

export class UpsertSummaryDto {
  @ApiProperty({ example: 'Client signale une fuite d\'eau urgente.' })
  @IsString()
  shortSummary: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  structuredSummary?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Planifier une intervention d\'urgence' })
  @IsOptional()
  @IsString()
  recommendedAction?: string;

  @ApiPropertyOptional({ example: ['urgence', 'fuite', 'plomberie'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: CallOutcome })
  @IsOptional()
  @IsEnum(CallOutcome)
  outcome?: CallOutcome;
}