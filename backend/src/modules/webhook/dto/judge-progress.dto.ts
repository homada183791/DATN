import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JudgeProgressDto {
  @ApiProperty({ description: 'Mã bài nộp', format: 'uuid' })
  @IsUUID()
  submission_id: string;

  @ApiProperty({ description: 'Số testcase đã hoàn thành', minimum: 1 })
  @IsInt()
  @Min(1)
  completed_tests: number;

  @ApiProperty({ description: 'Tổng số testcase', minimum: 1 })
  @IsInt()
  @Min(1)
  total_tests: number;

  @ApiProperty({ description: 'Index của testcase vừa hoàn thành', minimum: 0 })
  @IsInt()
  @Min(0)
  testcase_index: number;
}
