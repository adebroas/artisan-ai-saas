import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Bonjour, mon chauffage ne fonctionne plus' })
  @IsString()
  @MinLength(1)
  userMessage: string;
}