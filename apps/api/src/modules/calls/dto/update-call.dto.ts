import { IsOptional, IsEnum, IsString, IsInt, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, UrgencyLevel, CallOutcome } from '@prisma/client';
import { Type } from 'class-transformer';

export class UpdateCallDto {
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
  @Type(() => Date)
  @IsDate()
  endedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recordingUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;
}