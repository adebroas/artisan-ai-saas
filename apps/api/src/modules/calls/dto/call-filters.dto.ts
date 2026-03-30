import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, UrgencyLevel, CallOutcome } from '@prisma/client';

export class CallFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ enum: CallStatus })
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @ApiPropertyOptional({ enum: UrgencyLevel })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgencyLevel?: UrgencyLevel;

  @ApiPropertyOptional({ enum: CallOutcome })
  @IsOptional()
  @IsEnum(CallOutcome)
  outcome?: CallOutcome;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callerNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}