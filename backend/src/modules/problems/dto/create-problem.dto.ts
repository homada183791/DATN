import { IsEnum, IsInt, IsNotEmpty, IsString, IsBoolean, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty } from '@prisma/client';

export class TestCaseDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  expected_output: string;

  @IsBoolean()
  @IsOptional()
  is_hidden?: boolean;
}

export class CreateProblemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @IsInt()
  @IsNotEmpty()
  time_limit: number;

  @IsInt()
  @IsNotEmpty()
  memory_limit: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  @IsOptional()
  test_cases?: TestCaseDto[];
}
