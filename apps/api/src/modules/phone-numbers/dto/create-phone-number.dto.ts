import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhoneNumberDto {
  @ApiProperty({ example: '+33600000000' })
  @IsString()
  number: string;

  @ApiPropertyOptional({ example: 'Ligne principale' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}