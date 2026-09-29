import { ResourceType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateResourceDto {
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  name: string;

  @IsEnum(ResourceType)
  type: ResourceType;

  /** Heures par semaine pour une personne, unités pour du matériel ou une salle. */
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity: number;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  unit?: string;
}

export class CreateAllocationDto {
  @IsString()
  projectId: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  amount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
