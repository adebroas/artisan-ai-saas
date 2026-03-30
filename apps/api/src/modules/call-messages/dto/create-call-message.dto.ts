import { IsString, IsEnum, IsOptional, IsNumber, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Speaker } from '@prisma/client';

export class CreateCallMessageDto {
  @ApiProperty({ enum: Speaker })
  @IsEnum(Speaker)
  speaker: Speaker;

  @ApiProperty({ example: 'Bonjour, j\'ai une fuite d\'eau chez moi.' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ example: 0.95 })
  @IsOptional()
  @IsNumber()
  confidence?: number;

  @ApiPropertyOptional({ example: 'deepgram' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @IsInt()
  offsetMs?: number;
}