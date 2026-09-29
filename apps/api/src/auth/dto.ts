import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trimLower)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @Transform(trim)
  @IsString()
  @Length(2, 60, { message: 'Le nom doit faire entre 2 et 60 caractères' })
  name: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  workspaceName?: string;
}

export class LoginDto {
  @Transform(trimLower)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
