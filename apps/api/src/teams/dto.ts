import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, Length, Matches } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTeamDto {
  @Transform(trim)
  @IsString()
  @Length(2, 50, { message: "Le nom de l'équipe doit faire entre 2 et 50 caractères" })
  name: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Couleur attendue au format #RRGGBB' })
  color?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 50)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;
}

/** Remplace la composition de l'équipe par cette liste. */
export class SetTeamMembersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds: string[];
}
