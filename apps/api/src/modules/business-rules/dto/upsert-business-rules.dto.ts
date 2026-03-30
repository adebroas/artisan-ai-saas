import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertBusinessRulesDto {
  @ApiPropertyOptional({
    example: { monday: { open: '08:00', close: '18:00', active: true } },
  })
  @IsOptional()
  @IsObject()
  openingHours?: Record<string, unknown>;

  @ApiPropertyOptional({ example: ['fuite_eau', 'panne_chaudiere'] })
  @IsOptional()
  supportedRequestTypes?: string[];

  @ApiPropertyOptional({
    example: [{ keyword: 'inondation', level: 'critical' }],
  })
  @IsOptional()
  urgencyRules?: Record<string, unknown>[];

  @ApiPropertyOptional({
    example: ['caller_name', 'address', 'problem_description'],
  })
  @IsOptional()
  requiredFields?: string[];

  @ApiPropertyOptional({
    example: { enabled: true, number: '+33600000000', conditions: ['critical'] },
  })
  @IsOptional()
  @IsObject()
  transferRules?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { enabled: true, slotDuration: 60, advanceBookingDays: 14 },
  })
  @IsOptional()
  @IsObject()
  appointmentRules?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: { blockSpam: true, blockAnonymous: false },
  })
  @IsOptional()
  @IsObject()
  callFilterRules?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Merci de votre appel, bonne journée.' })
  @IsOptional()
  @IsString()
  closingMessage?: string;
}