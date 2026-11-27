import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class StartTestGenDto {
  /** Bỏ trống = AI tự viết 2 lời giải (nhanh + trâu) để chấm chéo. */
  @IsOptional()
  @IsIn(['C', 'CPP', 'PYTHON', 'GO', 'JAVA', 'NODE'])
  reference_language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reference_version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60_000)
  reference_code?: string;

  @IsOptional() @IsInt() @Min(0) @Max(15)
  random_count?: number;

  @IsOptional() @IsInt() @Min(0) @Max(15)
  edge_count?: number;

  @IsOptional() @IsInt() @Min(0) @Max(10)
  adversarial_count?: number;
}

export class SampleDto {
  @IsString()
  @MaxLength(20_000)
  input!: string;

  @IsString()
  @MaxLength(20_000)
  expected_output!: string;
}

/** Sinh test ngay trong form tạo/sửa đề (bài có thể chưa lưu). */
export class StartDraftTestGenDto extends StartTestGenDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(60_000)
  description!: string;

  @IsInt() @Min(100) @Max(15_000)
  time_limit!: number;

  @IsInt() @Min(16) @Max(1024)
  memory_limit!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SampleDto)
  samples?: SampleDto[];
}

export class ApplyTestGenDto {
  @IsArray()
  @IsString({ each: true })
  candidate_ids!: string[];
}
