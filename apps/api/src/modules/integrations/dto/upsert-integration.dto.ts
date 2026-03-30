import { IsOptional, IsEnum, IsObject, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationType, IntegrationStatus } from '@prisma/client';

export class UpsertIntegrationDto {
  @ApiProperty({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}