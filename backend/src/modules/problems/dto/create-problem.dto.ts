import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsBoolean,
  ValidateNested,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Difficulty } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestCaseDto {
  @ApiProperty({ description: 'Đầu vào của testcase', example: '1 2' })
  @IsString()
  @IsNotEmpty()
  input: string;

  @ApiProperty({ description: 'Đầu ra mong đợi', example: '3' })
  @IsString()
  @IsNotEmpty()
  expected_output: string;

  @ApiPropertyOptional({
    description: 'Ẩn testcase này đối với sinh viên',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_hidden?: boolean;
}

export class CreateProblemDto {
  @ApiProperty({ description: 'Tên bài tập', example: 'Tính tổng 2 số' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Mô tả bài tập',
    example: 'Nhập vào 2 số a và b, in ra tổng của chúng.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    enum: Difficulty,
    description: 'Độ khó',
    example: Difficulty.EASY,
  })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;

  @ApiProperty({ description: 'Giới hạn thời gian (ms)', example: 1000 })
  @IsInt()
  @IsNotEmpty()
  time_limit: number;

  @ApiProperty({ description: 'Giới hạn bộ nhớ (MB)', example: 256 })
  @IsInt()
  @IsNotEmpty()
  memory_limit: number;

  @ApiPropertyOptional({
    type: [TestCaseDto],
    description: 'Danh sách các testcases',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  @IsOptional()
  test_cases?: TestCaseDto[];
}
