import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CallStatus, UrgencyLevel, CallOutcome } from '@prisma/client';

export class CreateCallDto {
  @ApiProperty({ example: 'clx123abc' })
  @IsString()
  businessId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: '+33600000000' })
  @IsString()
  callerNumber: string;

  @ApiPropertyOptional({ example: '+33700000000' })
  @IsOptional()
  @IsString()
  calledNumber?: string;

  @ApiPropertyOptional({ example: 'call_abc123' })
  @IsOptional()
  @IsString()
  externalCallId?: string;

  @ApiPropertyOptional({ enum: CallStatus })
  @IsOptional()
  @IsEnum(CallStatus)
  status?: CallStatus;

  @ApiPropertyOptional({ enum: UrgencyLevel })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgencyLevel?: UrgencyLevel;
}