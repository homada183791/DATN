import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'Mức gợi ý 1 (gợi mở), 2 (chỉ chỗ sai), 3 (cách sửa). Bài tập có điểm chỉ mở dần từng mức; luyện tập mặc định mức 3.',
    minimum: 1,
    maximum: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  level?: number;
}
