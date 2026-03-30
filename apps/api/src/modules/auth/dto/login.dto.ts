import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@artisan-ai.fr' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'motdepasse123' })
  @IsString()
  @MinLength(6, { message: 'Mot de passe trop court' })
  password: string;
}