import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestResultItemDto {
  @ApiProperty({ description: 'Thứ tự testcase (index)', example: 0 })
  @IsInt({ message: 'Thứ tự testcase (index) phải là số nguyên' })
  @IsNotEmpty({ message: 'Thứ tự testcase không được để trống' })
  testcase_index: number;

  @ApiProperty({ enum: SubmissionStatus, description: 'Trạng thái testcase', example: SubmissionStatus.ACCEPTED })
  @IsEnum(SubmissionStatus, { message: 'Trạng thái testcase không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái testcase không được để trống' })
  status: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Thời gian chạy (ms)', example: 50 })
  @IsInt({ message: 'Thời gian chạy phải là số nguyên (ms)' })
  @IsOptional()
  execution_time?: number;

  @ApiPropertyOptional({ description: 'Bộ nhớ sử dụng (MB)', example: 10 })
  @IsInt({ message: 'Bộ nhớ sử dụng phải là số nguyên (MB)' })
  @IsOptional()
  memory_used?: number;
}

export class JudgeResultDto {
  @ApiProperty({ description: 'Mã bài nộp (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID(undefined, { message: 'Mã bài nộp (submission_id) không đúng định dạng UUID' })
  @IsNotEmpty({ message: 'Mã bài nộp không được để trống' })
  submission_id: string;

  @ApiProperty({ enum: SubmissionStatus, description: 'Trạng thái tổng quát của bài nộp', example: SubmissionStatus.ACCEPTED })
  @IsEnum(SubmissionStatus, { message: 'Trạng thái chấm bài không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Thời gian chạy tổng (ms)', example: 150 })
  @IsInt({ message: 'Thời gian chạy phải là số nguyên (ms)' })
  @IsOptional()
  execution_time?: number;

  @ApiPropertyOptional({ description: 'Bộ nhớ sử dụng lớn nhất (MB)', example: 12 })
  @IsInt({ message: 'Bộ nhớ sử dụng phải là số nguyên (MB)' })
  @IsOptional()
  memory_used?: number;

  @ApiPropertyOptional({ type: [TestResultItemDto], description: 'Mảng chi tiết kết quả từng testcase' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultItemDto)
  @IsOptional()
  test_results?: TestResultItemDto[];
}

