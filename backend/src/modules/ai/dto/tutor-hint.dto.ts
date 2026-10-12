import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HintType {
  HINT = 'HINT',
  COMPLEXITY = 'COMPLEXITY',
  EDGE_CASE = 'EDGE_CASE',
  EXPLAIN_LOGIC = 'EXPLAIN_LOGIC',
}

export class TutorHintDto {
  @ApiProperty({ description: 'ID bài toán' })
  @IsNotEmpty({ message: 'Problem ID không được để trống' })
  @IsString()
  problem_id: string;

  @ApiProperty({ description: 'Mã nguồn hiện tại của sinh viên' })
  @IsNotEmpty({ message: 'Source code không được để trống' })
  @IsString()
  current_code: string;

  @ApiProperty({ description: 'Ngôn ngữ lập trình', example: 'python' })
  @IsNotEmpty({ message: 'Ngôn ngữ không được để trống' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ enum: HintType, default: HintType.HINT })
  @IsOptional()
  @IsEnum(HintType)
  hint_type?: HintType = HintType.HINT;

  @ApiPropertyOptional({ description: 'ID kỳ thi (nếu đang trong contest)' })
  @IsOptional()
  @IsString()
  contest_id?: string;
}
