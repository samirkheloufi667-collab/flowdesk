import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';

export class CreateWorkspaceDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60)
  name: string;
}

export class AddMemberDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsEnum(Role)
  role: Role;
}

export class ChangeRoleDto {
  @IsEnum(Role)
  role: Role;
}
