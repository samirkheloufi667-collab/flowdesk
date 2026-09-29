import { Priority, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTaskDto {
  @Transform(trim)
  @IsString()
  @Length(1, 200, { message: 'Le titre doit faire entre 1 et 200 caractères' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  /** Estimation en heures. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  estimate?: number | null;
}

export class UpdateTaskDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  estimate?: number | null;
}

/** Déplacement sur le tableau Kanban : nouvelle colonne et nouvelle position. */
export class MoveTaskDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  position: number;
}
