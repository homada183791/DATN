import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class StartTestGenDto {
  @IsIn(['C', 'CPP', 'PYTHON', 'GO', 'JAVA', 'NODE'])
  reference_language!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reference_version?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(60_000)
  reference_code!: string;

  @IsOptional() @IsInt() @Min(0) @Max(15)
  random_count?: number;

  @IsOptional() @IsInt() @Min(0) @Max(15)
  edge_count?: number;

  @IsOptional() @IsInt() @Min(0) @Max(10)
  adversarial_count?: number;
}

export class ApplyTestGenDto {
  @IsString({ each: true })
  candidate_ids!: string[];
}
