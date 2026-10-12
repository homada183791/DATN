import { IsOptional, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TestCaseStrategy {
  FROM_DESCRIPTION = 'FROM_DESCRIPTION',
  FROM_SOLUTION = 'FROM_SOLUTION',
}

export class GenerateTestCasesDto {
  @ApiPropertyOptional({ description: 'ID bài toán có sẵn (nếu có)' })
  @IsOptional()
  @IsString()
  problem_id?: string;

  @ApiPropertyOptional({ description: 'Tiêu đề bài toán' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả bài toán (Markdown)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Code giải mẫu của giảng viên (nếu có)' })
  @IsOptional()
  @IsString()
  solution_code?: string;

  @ApiPropertyOptional({ description: 'Ngôn ngữ code giải mẫu', example: 'python' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Số lượng testcase cần sinh', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  count?: number = 5;

  @ApiPropertyOptional({ enum: TestCaseStrategy, default: TestCaseStrategy.FROM_DESCRIPTION })
  @IsOptional()
  @IsEnum(TestCaseStrategy)
  strategy?: TestCaseStrategy = TestCaseStrategy.FROM_DESCRIPTION;
}
